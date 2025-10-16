"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Shield
} from "lucide-react"
import { getUser, User as UserType, updateUserProfile, supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PricingPopup } from "@/components/pricing-popup"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [userData, setUserData] = useState<UserType | null>(null)
  const [, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [pricingPopupOpen, setPricingPopupOpen] = useState(false)
  
  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserData = async () => {
    if (!user) return
    
    try {
      const data = await getUser(user.id)
      setUserData(data)
      setName(data?.fullName || "")
      setEmail(user.email || "")
      setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    
    // Basic validation
    if (name.trim().length === 0) {
      toast.error("Please enter a valid name")
      return
    }
    
    if (name.trim().length > 50) {
      toast.error("Name must be less than 50 characters")
      return
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }
    
    setSaving(true)
    try {
      // Update the user's name in the database
      const updatedUser = await updateUserProfile(user.id, { fullName: name.trim() })
      setUserData(updatedUser)
      
      // Update email if it has changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email
        })
        
        if (emailError) {
          throw emailError
        }
        
        toast.success("Profile and email updated successfully! Please check your email to confirm the new address.")
      } else {
        toast.success("Profile updated successfully!")
      }
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast.error(error.message || "Failed to update profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match")
      return
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }
    
    setSaving(true)
    try {
      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        throw error
      }
      
      // Clear password fields
      setNewPassword("")
      setConfirmPassword("")
      
      toast.success("Password updated successfully!")
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || "Failed to update password. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmText = "DELETE"
    const userInput = prompt(
      `Are you sure you want to permanently delete your account? This action cannot be undone.\n\nAll your data including saved questions, question attempts, and progress will be permanently lost.\n\nType "${confirmText}" to confirm:`
    )
    
    if (userInput !== confirmText) {
      return
    }
    
    if (!user) return
    
    setSaving(true)
    try {
      // Delete user data from database first
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
      
      if (deleteError) {
        console.error('Error deleting user data:', deleteError)
        // Continue with auth deletion even if database deletion fails
      }
      
      // Delete the auth user (this will cascade delete related data if foreign keys are set up)
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
      
      if (authError) {
        // If admin delete fails, try user-initiated deletion
        const { error: userDeleteError } = await supabase.rpc('delete_user')
        if (userDeleteError) {
          throw userDeleteError
        }
      }
      
      toast.success("Account deleted successfully")
      await signOut()
    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast.error(error.message || "Failed to delete account. Please contact support.")
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!user) return
    
    try {
      // Get user's saved questions and question attempts
      const [savedQuestions, questionAttempts] = await Promise.all([
        supabase
          .from('saved_questions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('question_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ])
      
      if (savedQuestions.error) throw savedQuestions.error
      if (questionAttempts.error) throw questionAttempts.error
      
      // Create export data object
      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          fullName: userData?.fullName,
          tier: userData?.tier,
          createdAt: userData?.created_at
        },
        savedQuestions: savedQuestions.data || [],
        questionAttempts: questionAttempts.data || [],
        exportDate: new Date().toISOString()
      }
      
      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `markpal-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success("Data exported successfully!")
    } catch (error: any) {
      console.error('Error exporting data:', error)
      toast.error(error.message || "Failed to export data. Please try again.")
    }
  }

  if (!user) {
    return null // Will redirect
  }


  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account and preferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userData ? (
              <>
                <Badge variant="secondary">
                  {userData.tier.charAt(0).toUpperCase() + userData.tier.slice(1)} Plan
                </Badge>
                {userData.tier !== 'pro+' && (
                  <Button 
                    size="sm"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Password Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>
                  Manage your account data and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <h4 className="font-semibold">Export Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Download a copy of your data
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10">
                  <div>
                    <h4 className="font-semibold text-destructive">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PricingPopup 
        isOpen={pricingPopupOpen} 
        onClose={() => setPricingPopupOpen(false)}
        currentTier={userData?.tier || 'free'}
      />
    </DashboardLayout>
  )
}
