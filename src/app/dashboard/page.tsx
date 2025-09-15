"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  Target, 
  Bookmark, 
  TrendingUp, 
  ArrowRight,
  Clock
} from "lucide-react"
import Link from "next/link"
import { getUser, User, getUserStats, checkAndResetUserQuestions } from "@/lib/supabase"
import { PricingPopup } from "@/components/pricing-popup"

export default function Dashboard() {
  const { user, session } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [userStats, setUserStats] = useState({
    questionsUsed: 0,
    averageScore: 0,
    savedQuestions: 0,
    streak: 0
  })
  const [loading, setLoading] = useState(true)
  const [pricingPopupOpen, setPricingPopupOpen] = useState(false)

  const loadUserData = useCallback(async () => {
    if (!user || !session) return
    
    try {
      // First check and reset questions if needed (this happens in getUser, but let's be explicit)
      await checkAndResetUserQuestions(user.id, session.access_token)
      
      const [data, stats] = await Promise.all([
        getUser(user.id, session.access_token),
        getUserStats(user.id, session.access_token)
      ])
      setUserData(data)
      setUserStats(stats)
      setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      setLoading(false)
    }
  }, [user, session])

  useEffect(() => {
    if (user && session) {
      loadUserData()
    }
  }, [user, session, loadUserData])

  if (!user) {
    return null // Will redirect
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const stats = [
    {
      title: "Questions Practiced",
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
              Ready to improve your exam technique? Let's get started.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {userData?.tier ? userData.tier.charAt(0).toUpperCase() + userData.tier.slice(1) : 'Free'} Plan
            </Badge>
            {userData?.tier !== 'pro+' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setPricingPopupOpen(true)}
              >
                {userData?.tier === 'free' ? 'Upgrade' : 'Change Plan'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
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
          ))}
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
    </DashboardLayout>
  )
}
