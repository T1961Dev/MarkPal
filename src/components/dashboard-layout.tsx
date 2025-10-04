"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"
import { ProfileDropdown } from "./profile-dropdown"
import { ProfileSettingsDialog } from "./profile-settings-dialog"
import { QuestionsProgress } from "./questions-progress"
import { PricingPopup } from "./pricing-popup"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getUser, User as UserType, checkAndResetUserQuestions } from "@/lib/supabase"
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

const secondaryItems = [
  {
    title: "Help & Support",
    url: "/dashboard/help",
    icon: HelpCircle,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, session, signOut } = useAuth()
  const pathname = usePathname()
  const [userData, setUserData] = useState<UserType | null>(null)
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
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                              <p>Coming Soon - This feature will be available soon!</p>
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      )
                    }

                    // Special handling for Upload Question - Pro+ restriction
                    if (item.title === "Upload Question") {
                      const isProPlus = userData?.tier === 'pro+'
                      return (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                className={`w-full justify-start ${!isProPlus ? 'text-muted-foreground cursor-not-allowed' : ''}`}
                                onClick={(e) => {
                                  if (!isProPlus) {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setPricingPopupOpen(true)
                                  }
                                }}
                                asChild={isProPlus}
                              >
                                {isProPlus ? (
                                  <Link href={item.url}>
                                    <div className="flex items-center gap-2">
                                      <item.icon className="h-4 w-4" />
                                      <span>{item.title}</span>
                                    </div>
                                  </Link>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                    <Crown className="h-4 w-4 text-blue-600" />
                                  </div>
                                )}
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isProPlus ? 'Practice with AI feedback' : 'Pro+ plan required for practice sessions'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      )
                    }

                    // Regular navigation items
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                          className="w-full justify-start"
                        >
                          <Link href={item.url}>
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator className="my-4" />

            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {secondaryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        className="w-full justify-start"
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4">
            <div className="space-y-3">
              {/* Questions Progress */}
              <div className="px-3">
                <QuestionsProgress userData={userData} />
              </div>

              {/* User Profile */}
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
                  <Crown className="h-4 w-4 ml-2 text-blue-600" />
                </Button>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
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
