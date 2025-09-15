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
} from "lucide-react"
import { ProfileDropdown } from "./profile-dropdown"
import { ProfileSettingsDialog } from "./profile-settings-dialog"
import { QuestionsProgress } from "./questions-progress"
import { PricingPopup } from "./pricing-popup"
import { getUser, User as UserType, checkAndResetUserQuestions } from "@/lib/supabase"
import { useEffect, useCallback } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Question Bank",
    url: "/dashboard/question-bank",
    icon: BookOpen,
  },
  {
    title: "Upload Question",
    url: "/dashboard/practice",
    icon: Target,
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

  if (!user) {
    return null // Will redirect
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Mark Pal</h1>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3">
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
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
                <QuestionsProgress />
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
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {userData?.tier ? userData.tier.charAt(0).toUpperCase() + userData.tier.slice(1) : 'Free'} Plan
                    </Badge>
                    {userData?.tier !== 'pro+' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-5 px-2 text-xs"
                        onClick={() => setPricingPopupOpen(true)}
                      >
                        {userData?.tier === 'free' ? 'Upgrade' : 'Change Plan'}
                      </Button>
                    )}
                  </div>
                </div>
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
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/practice">
                  <Target className="h-4 w-4 mr-2" />
                  Quick Practice
                </Link>
              </Button>
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
