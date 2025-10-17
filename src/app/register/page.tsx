"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { useDeviceRegistration } from "@/hooks/use-device-registration"
import { Loader2, Mail, Lock, User, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { user, signUp } = useAuth()
  const router = useRouter()
  const { isLoading: deviceCheckLoading, hasExistingAccount, registrationDate, registerDevice } = useDeviceRegistration()

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if device already has an account
    if (hasExistingAccount) {
      setError("This device already has a registered account. Each device can only have one account.")
      toast.error("Device registration limit reached")
      return
    }
    
    setLoading(true)
    setError("")

    try {
      const { error, user: newUser } = await signUp(email, password, name)
      if (error) {
        setError(error.message)
        toast.error("Registration failed. Please try again.")
      } else {
        // Register the device after successful signup
        if (newUser) {
          const deviceRegistered = await registerDevice(newUser.id)
          if (!deviceRegistered) {
            console.warn('Failed to register device, but user account was created')
          }
        }
        
        toast.success("Account created successfully! Check your email to verify your account.")
        router.push("/login")
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError("An unexpected error occurred")
      toast.error("Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Register Card */}
        <Card className="border-2 border-primary/20 shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex items-center justify-center">
              <Image 
                src="/pics/logo.png" 
                alt="Mark Pal Logo" 
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
              <CardDescription className="text-lg">
                Sign up to start improving your exam technique
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {/* Device Registration Warning */}
            {deviceCheckLoading ? (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-800">Checking device registration status...</p>
              </div>
            ) : hasExistingAccount ? (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="text-sm font-medium text-red-800">Device Already Registered</h3>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  This device already has a registered account. Each device can only have one account to prevent spam.
                </p>
                {registrationDate && (
                  <p className="text-xs text-red-600">
                    Account created on: {new Date(registrationDate).toLocaleDateString()}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-red-200">
                  <Link href="/login" className="text-sm text-red-600 hover:text-red-800 underline">
                    Already have an account? Sign in instead
                  </Link>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 text-base border-2 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 text-base border-2 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 text-base border-2 focus:border-primary"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading || hasExistingAccount}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link 
                  href="/login" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="border border-primary/10 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-center">What you get with Mark Pal:</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">5 free questions per day</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Instant AI feedback on your answers</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">GCSE Biology, Chemistry, Physics & Computer Science</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Save and track your progress</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
