"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BookOpen, 
  Target, 
  Bookmark, 
  TrendingUp, 
  ArrowRight,
  Clock,
  Calendar
} from "lucide-react"
import Link from "next/link"
import { getUser, User, getUserStats, markWelcomeSeen, getOptimisticUserData } from "@/lib/supabase"
import { PricingPopup } from "@/components/pricing-popup"
import { WelcomePopup } from "@/components/welcome-popup"
import { dataSync } from "@/lib/data-sync"

export default function Dashboard() {
  const { user, session } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [userStats, setUserStats] = useState({
    questionsUsed: 0,
    averageScore: 0,
    savedQuestions: 0,
    streak: 0
  })
  const [loading, setLoading] = useState(false)
  const [pricingPopupOpen, setPricingPopupOpen] = useState(false)
  const [welcomePopupOpen, setWelcomePopupOpen] = useState(false)
  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'alltime'>('alltime')

  const loadUserData = useCallback(async (retryCount = 0) => {
    if (!user || !session) return
    
    try {
      setLoading(true)
      
      // Use cached data first for instant loading
      const cachedData = getOptimisticUserData(user.id)
      if (cachedData) {
        setUserData(cachedData)
        // Load stats in background
        getUserStats(user.id, session.access_token, timePeriod).then(setUserStats)
        
        // Check welcome popup
        if (cachedData.has_seen_welcome === false) {
          setWelcomePopupOpen(true)
        }
        setLoading(false)
        return
      }
      
      // Only fetch from database if no cached data
      const [data, stats] = await Promise.all([
        getUser(user.id, session.access_token),
        getUserStats(user.id, session.access_token, timePeriod)
      ])
      setUserData(data)
      setUserStats(stats)
      
      // Check if this is a first-time user who hasn't seen the welcome popup
      if (data && data.has_seen_welcome === false) {
        setWelcomePopupOpen(true)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      
      // More detailed error logging for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      } else {
        console.error('Non-Error object:', error)
      }
      
      // Retry logic for network errors
      if (retryCount < 2 && error instanceof Error && error.message?.includes('fetch')) {
        console.log(`Retrying data load (attempt ${retryCount + 1})`)
        setTimeout(() => {
          loadUserData(retryCount + 1)
        }, 1000 * (retryCount + 1)) // Exponential backoff
      }
    } finally {
      setLoading(false)
    }
  }, [user, session, timePeriod])

  const handleWelcomeClose = async () => {
    if (user && session && userData && userData.has_seen_welcome === false) {
      try {
        await markWelcomeSeen(user.id, session.access_token)
        // Update local user data to reflect the change
        setUserData({ ...userData, has_seen_welcome: true })
      } catch (error) {
        console.error('Error marking welcome as seen:', error)
        // Even if marking as seen fails, close the popup
      }
    }
    setWelcomePopupOpen(false)
  }

  const handleWelcomeUpgrade = (_tier: 'basic' | 'pro' | 'pro+') => {
    // Close welcome popup and open pricing popup
    setWelcomePopupOpen(false)
    setPricingPopupOpen(true)
  }

  useEffect(() => {
    if (user && session) {
      loadUserData()
    }
  }, [user, session, loadUserData])

  // Refresh data when questions are used
  useEffect(() => {
    const handleQuestionsUsed = () => {
      if (user && session) {
        loadUserData()
      }
    }
    
    // Listen to both legacy events and new data sync events
    window.addEventListener('questionsUsed', handleQuestionsUsed)
    const unsubscribeDataSync = dataSync.subscribe('questionsUsed', handleQuestionsUsed)
    const unsubscribeUserData = dataSync.subscribe('userDataChanged', handleQuestionsUsed)
    const unsubscribeSubscription = dataSync.subscribe('subscriptionUpdated', handleQuestionsUsed)
    
    return () => {
      window.removeEventListener('questionsUsed', handleQuestionsUsed)
      unsubscribeDataSync()
      unsubscribeUserData()
      unsubscribeSubscription()
    }
  }, [user, session, loadUserData])

  // Refresh data when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && session) {
        loadUserData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, session, loadUserData])

  // Periodic refresh for critical data (every 30 seconds when page is visible)
  useEffect(() => {
    if (!user || !session) return

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadUserData()
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [user, session, loadUserData])

  if (!user) {
    return null // Will redirect
  }

  const getTimePeriodLabel = (period: string) => {
    switch (period) {
      case 'today': return 'Questions Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'alltime': return 'All Time'
      default: return 'Questions'
    }
  }

  const stats = [
    {
      title: getTimePeriodLabel(timePeriod),
      value: userStats.questionsUsed,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Average Score",
      value: `${userStats.averageScore}%`,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Saved Questions",
      value: userStats.savedQuestions,
      icon: Bookmark,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Streak",
      value: `${userStats.streak} days`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  const quickActions = [
    {
      title: "Start Practice",
      description: "Practice with questions from your bank",
      icon: Target,
      href: "/dashboard/practice",
      color: "bg-primary hover:bg-primary/90",
    },
    {
      title: "Browse Questions",
      description: "Explore the question bank",
      icon: BookOpen,
      href: "/dashboard/question-bank",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "View Analytics",
      description: "Track your progress",
      icon: TrendingUp,
      href: "/dashboard/analytics",
      color: "bg-green-600 hover:bg-green-700",
    },
  ]


  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {(userData?.fullName || user?.email?.split('@')[0] || "Student").split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready to improve your exam technique? Let&apos;s get started.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userData ? (
              <>
                <Badge variant="secondary" className="text-sm">
                  {userData.tier.charAt(0).toUpperCase() + userData.tier.slice(1)} Plan
                </Badge>
                {userData.tier !== 'pro+' && (
                  <Button 
                    size="sm" 
                    variant="default"
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => setPricingPopupOpen(true)}
                  >
                    {userData.tier === 'free' ? 'Upgrade' : 'Change Plan'}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 bg-muted rounded animate-pulse"></div>
                <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Progress</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Showing stats for {getTimePeriodLabel(timePeriod).toLowerCase()}
            </p>
          </div>
          <Tabs value={timePeriod} onValueChange={(value) => setTimePeriod(value as 'today' | 'week' | 'month' | 'alltime')}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Today
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Month
              </TabsTrigger>
              <TabsTrigger value="alltime" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Skeleton loading for stats
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                      <div className="h-8 w-12 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="h-12 w-12 bg-muted rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${action.color} text-white`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity - Compact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-blue-100">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Biology Question</p>
                  <p className="text-xs text-muted-foreground">8/10 • 2h ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-green-100">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Chemistry Practice</p>
                  <p className="text-xs text-muted-foreground">6/8 • 1d ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-purple-100">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Physics Review</p>
                  <p className="text-xs text-muted-foreground">9/12 • 2d ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <PricingPopup 
        isOpen={pricingPopupOpen} 
        onClose={() => setPricingPopupOpen(false)}
        currentTier={userData?.tier || 'free'}
      />
      
      <WelcomePopup
        isOpen={welcomePopupOpen}
        onClose={handleWelcomeClose}
      />
    </DashboardLayout>
  )
}
