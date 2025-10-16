"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  BookOpen,
  Home,
  Bookmark,
  Settings,
  User,
  LogOut,
  GraduationCap,
  Target,
  FileText,
  BarChart3,
  HelpCircle,
  Menu,
  Upload,
  Crown,
  Loader2,
} from "lucide-react"
import { ProfileDropdown } from "./profile-dropdown"
import { ProfileSettingsDialog } from "./profile-settings-dialog"
import { QuestionsProgress } from "./questions-progress"
import { PricingPopup } from "./pricing-popup"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getUser, User as UserType, checkAndResetUserQuestions, invalidateUserCache, getOptimisticUserData, getUserFromStorage } from "@/lib/supabase"
import { useEffect, useCallback } from "react"
import { dataSync } from "@/lib/data-sync"

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  title: string
  url: string
  icon: any
}

const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Upload Question",
    url: "/dashboard/practice",
    icon: Target,
  },
  {
    title: "Exam Paper Upload",
    url: "/exam-upload",
    icon: Upload,
  },
  {
    title: "Saved Questions",
    url: "/dashboard/saved-questions",
    icon: Bookmark,
  },
]


export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, session, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [userData, setUserData] = useState<UserType | null>(null)
  const [isLoadingUserData, setIsLoadingUserData] = useState(true)

  // Initialize with optimistic data for instant UI
  useEffect(() => {
    if (user && !userData) {
      // Try localStorage first for instant data
      const storedData = getUserFromStorage(user.id)
      if (storedData) {
        setUserData(storedData)
        setIsLoadingUserData(false) // Stop loading immediately
        return
      }
      
      // Fallback to in-memory cache
      const optimisticData = getOptimisticUserData(user.id)
      if (optimisticData) {
        setUserData(optimisticData)
        setIsLoadingUserData(false) // Stop loading immediately if we have cached data
      }
    }
  }, [user, userData])

  // Prefetch routes for instant navigation
  useEffect(() => {
    const prefetchRoutes = () => {
      navigationItems.forEach(item => {
        router.prefetch(item.url)
      })
    }
    
    // Prefetch after a short delay to not block initial render
    const timeoutId = setTimeout(prefetchRoutes, 100)
    return () => clearTimeout(timeoutId)
  }, [router])
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [pricingPopupOpen, setPricingPopupOpen] = useState(false)

  const loadUserData = useCallback(async () => {
    if (!user || !session) return
    
    try {
      // Check and reset questions if needed
      await checkAndResetUserQuestions(user.id, session.access_token)
      
      const data = await getUser(user.id, session.access_token)
      setUserData(data)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoadingUserData(false)
    }
  }, [user, session])

  useEffect(() => {
    if (user && session) {
      loadUserData()
    }
  }, [user, session, loadUserData])

  // Refresh data when questions are used
  useEffect(() => {
    const handleQuestionsUsed = () => {
      if (user && session) {
        // Invalidate cache and reload data
        invalidateUserCache(user.id)
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

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && session) {
        loadUserData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, session, loadUserData])

  if (!user) {
    return null // Will redirect
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-2">
              <img 
                src="/pics/logo.png" 
                alt="Mark Pal Logo" 
                className="h-7 w-7 object-contain"
              />
              <div>
                <h1 className="text-xl font-normal">Mark Pal</h1>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    // Special handling for Exam Paper Upload - greyed out disabled state
                    if (item.title === "Exam Paper Upload") {
                      return (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                className="w-full justify-start text-muted-foreground cursor-not-allowed"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </div>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Coming Soon</p>
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      )
                    }


                    // Regular navigation items
                    const isActive = pathname === item.url
                    
                    return (
                        <SidebarMenuItem key={item.title} className={isActive ? 'bg-accent rounded-md' : ''}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className="w-full justify-start"
                          >
                            <Link href={item.url}>
                              <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4" />
                                <span className={isActive ? 'text-primary font-medium' : ''}>{item.title}</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

          </SidebarContent>

          <SidebarFooter className="p-4">
            <div className="space-y-3">
              {/* Questions Progress */}
              <div className="px-3">
                <QuestionsProgress userData={userData} isLoading={isLoadingUserData} />
              </div>

              {/* User Profile */}
              {isLoadingUserData ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userData?.avatar_url} />
                    <AvatarFallback>
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {userData?.fullName || user?.email?.split('@')[0] || "User"}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {userData?.tier ? userData.tier.charAt(0).toUpperCase() + userData.tier.slice(1) : 'Free'} Plan
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link href="/dashboard/settings">
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navigation */}
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {navigationItems.find(item => item.url === pathname)?.title || "Dashboard"}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Quick Actions */}
              {userData?.tier === 'pro+' ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/practice">
                    <Target className="h-4 w-4 mr-2" />
                    Quick Practice
                  </Link>
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPricingPopupOpen(true)}
                  className="text-muted-foreground"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Quick Practice
                </Button>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            {isLoadingUserData ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading dashboard...</p>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {/* Dialogs */}
      <ProfileSettingsDialog
        isOpen={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      />

      <PricingPopup 
        isOpen={pricingPopupOpen} 
        onClose={() => setPricingPopupOpen(false)}
        currentTier={userData?.tier || 'free'}
      />
    </SidebarProvider>
  )
}
