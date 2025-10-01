"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, Star, Zap, Crown, X } from "lucide-react"
import { toast } from "sonner"

interface WelcomePopupProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: (tier: 'basic' | 'pro' | 'pro+') => void
}

export function WelcomePopup({ isOpen, onClose, onUpgrade }: WelcomePopupProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (tier: 'basic' | 'pro' | 'pro+') => {
    setLoading(tier)
    try {
      onUpgrade(tier)
      onClose()
    } catch (error) {
      console.error('Error upgrading:', error)
      toast.error('Failed to start upgrade process')
    } finally {
      setLoading(null)
    }
  }

  const handleContinueFree = () => {
    onClose()
    toast.success("Welcome to Mark Pal! You can upgrade anytime from the dashboard.")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-3xl font-bold">
            Welcome to Mark Pal! 🎉
          </DialogTitle>
          <DialogDescription className="text-lg">
            Choose your plan to start improving your GCSE exam technique with AI-powered feedback
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {/* Free Plan */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">Free</CardTitle>
              <div className="text-4xl font-bold text-primary">£0</div>
              <CardDescription className="text-base">
                Perfect for trying out the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">5 questions per day</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Basic AI feedback</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">All subjects supported</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Save your questions</span>
                </li>
              </ul>
              <Button 
                onClick={handleContinueFree}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                Continue with Free Plan
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-accent relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-accent text-accent-foreground px-3 py-1">
                Most Popular
              </Badge>
            </div>
            <CardHeader className="text-center pb-4 pt-6">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                Pro
              </CardTitle>
              <div className="text-4xl font-bold text-accent">£9.99</div>
              <div className="text-sm text-muted-foreground">/month</div>
              <CardDescription className="text-base">
                For serious students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm"><strong>Unlimited</strong> questions</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Advanced AI feedback</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Progress tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
              <Button 
                onClick={() => handleUpgrade('pro')}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                size="lg"
                disabled={loading === 'pro'}
              >
                {loading === 'pro' ? 'Starting...' : 'Start Pro Plan'}
              </Button>
            </CardContent>
          </Card>

          {/* Pro+ Plan */}
          <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-amber-600" />
                Pro+
              </CardTitle>
              <div className="text-4xl font-bold text-amber-600">£19.99</div>
              <div className="text-sm text-muted-foreground">/month</div>
              <CardDescription className="text-base">
                For exam success
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Everything in Pro</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Live mode feedback</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Exam paper upload</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Advanced analytics</span>
                </li>
              </ul>
              <Button 
                onClick={() => handleUpgrade('pro+')}
                variant="outline"
                className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                size="lg"
                disabled={loading === 'pro+'}
              >
                {loading === 'pro+' ? 'Starting...' : 'Start Pro+ Plan'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>No commitment:</strong> You can upgrade or downgrade your plan at any time. 
            All plans include a 30-day money-back guarantee.
          </p>
        </div>

        <div className="flex justify-center mt-6">
          <Button 
            variant="ghost" 
            onClick={handleContinueFree}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip for now - I'll decide later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
