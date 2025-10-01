"use client"

import { useState, useEffect } from "react"
import { GraduationCap, Bookmark, BookOpen, Upload, Lock, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { AuthDialog } from "./auth-dialog"
import { ProfileDropdown } from "./profile-dropdown"
import { ProfileSettingsDialog } from "./profile-settings-dialog"
import { QuestionsProgress } from "./questions-progress"
import { PricingPopup } from "./pricing-popup"
import { getUser, User } from "@/lib/supabase"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function Navbar() {
  const { user } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [pricingPopupOpen, setPricingPopupOpen] = useState(false)
  const [userData, setUserData] = useState<User | null>(null)

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return
    
    try {
      const data = await getUser(user.id)
      setUserData(data)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }


  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-20 py-4">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={() => {
              // Force a page reload to reset the component state
              window.location.href = '/'
            }}
          >
            <img 
              src="/pics/logo.png" 
              alt="Mark Pal Logo" 
              className="h-10 w-10 object-contain"
            />
          </Link>

          {/* Navigation Links - Centered on screen */}
          <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Subjects
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Support
            </a>
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Questions Progress */}
                <QuestionsProgress />

                {/* Question Bank Button */}
                <Link href="/question-bank">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Question Bank
                  </Button>
                </Link>

                {/* Exam Upload Button */}
                <Link href={userData?.tier === 'pro+' ? "/dashboard/question-bank?tab=upload" : "/exam-upload"}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`text-xs font-medium transition-colors ${
                      userData?.tier === 'pro+' 
                        ? "border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700" 
                        : "border-muted text-muted-foreground hover:bg-muted/50 relative"
                    }`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Exam Upload
                    {userData?.tier !== 'pro+' && <Lock className="h-3 w-3 ml-1" />}
                  </Button>
                </Link>

                {/* Upgrade Now Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-medium border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => setPricingPopupOpen(true)}
                >
                  Upgrade Now
                </Button>

                {/* Saved Questions Icon */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/saved-questions">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full bg-muted border border-border hover:bg-muted/80 transition-colors"
                        >
                          <Bookmark className="h-5 w-5 text-muted-foreground" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Saved Questions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Profile Dropdown */}
                <ProfileDropdown
                  onProfileClick={() => setProfileDialogOpen(true)}
                  onSettingsClick={() => setProfileDialogOpen(true)}
                />
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setAuthDialogOpen(true)}
                  className="hidden sm:flex btn-hover-border"
                >
                  Login
                </Button>
                <Button
                  onClick={() => setAuthDialogOpen(true)}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 accent-btn-hover"
                  data-auth-button
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Auth Dialog */}
      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
      />

      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog
        isOpen={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      />

      {/* Pricing Popup */}
      <PricingPopup 
        isOpen={pricingPopupOpen} 
        onClose={() => setPricingPopupOpen(false)}
        currentTier={userData?.tier || 'free'}
      />

    </>
  )
}
