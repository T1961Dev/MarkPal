"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Star, Zap, Crown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface WelcomePopupProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: (tier: 'basic' | 'pro' | 'pro+') => void
}

const plans = [
  {
    name: 'Free',
    tier: 'free' as const,
    price: '£0',
    period: 'forever',
    description: 'Perfect for trying out the system',
    icon: Star,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    features: [
      '5 questions per month',
      'Basic AI feedback',
      'All subjects supported',
      'Save your questions'
    ],
    buttonText: 'Start with Free',
    popular: false,
    isFree: true
  },
  {
    name: 'Basic',
    tier: 'basic' as const,
    price: '£10',
    period: 'per month',
    description: 'Great for regular students',
    icon: Star,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    features: [
      '20 questions per month',
      'Enhanced AI feedback',
      'Progress tracking',
      'Priority support'
    ],
    buttonText: 'Start Basic Plan',
    popular: false
  },
  {
    name: 'Pro',
    tier: 'pro' as const,
    price: '£20',
    period: 'per month',
    description: 'Best for serious students',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    features: [
      '50 questions per month',
      'Advanced AI feedback',
      'Detailed analytics',
      'Live mode practice'
    ],
    buttonText: 'Start Pro Plan',
    popular: true
  },
  {
    name: 'Pro+',
    tier: 'pro+' as const,
    price: '£25',
    period: 'per month',
    description: 'Ultimate for power users',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    features: [
      '<strong>Unlimited</strong> questions per month',
      '<strong>Exam paper upload</strong> - Upload and extract questions from full exam papers',
      '<strong>Save papers</strong> - Store and organize uploaded exam papers',
      '<strong>Advanced analytics</strong> - Detailed performance insights'
    ],
    buttonText: 'Start Pro+ Plan',
    popular: false
  }
]

export function WelcomePopup({ isOpen, onClose, onUpgrade }: WelcomePopupProps) {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'basic' | 'pro' | 'pro+' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handleUpgrade = async (tier: 'basic' | 'pro' | 'pro+') => {
    if (!user) {
      toast.error('Please log in to upgrade your plan')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: tier,
          userId: user.id,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        console.error('Error creating checkout session:', error)
        toast.error('Failed to create checkout session. Please try again.')
        return
      }

      if (!url) {
        toast.error('No checkout URL received. Please try again.')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Error upgrading plan:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueFree = () => {
    onClose()
    toast.success("Welcome to Mark Pal! You can upgrade anytime from the dashboard.")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-7xl w-full max-h-[80vh] overflow-y-auto p-6"
        style={{ maxWidth: '80vw', width: '80vw' }}
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            Welcome to Mark Pal! 🎉
          </DialogTitle>
          <p className="text-center text-muted-foreground text-lg">
            Choose your plan to start improving your GCSE exam technique with AI-powered feedback
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const IconComponent = plan.icon
            
            return (
              <Card 
                key={plan.tier}
                className={`relative ${
                  plan.popular
                    ? 'border-primary shadow-lg'
                    : plan.isFree
                    ? 'border-green-200 bg-green-50/50'
                    : 'hover:shadow-md transition-shadow'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2" variant="default">
                    Most Popular
                  </Badge>
                )}
                {plan.isFree && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2" variant="secondary">
                    Perfect for Starters
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${plan.bgColor}`}>
                      <IconComponent className={`w-6 h-6 ${plan.color}`} />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="text-4xl font-bold">{plan.price}</div>
                    <CardDescription>{plan.period}</CardDescription>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm" dangerouslySetInnerHTML={{ __html: feature }} />
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    variant={plan.isFree ? "secondary" : "default"}
                    disabled={isLoading}
                    onClick={() => {
                      if (plan.isFree) {
                        handleContinueFree()
                      } else {
                        setSelectedPlan(plan.tier)
                        if (plan.tier !== 'free') {
                          handleUpgrade(plan.tier)
                        }
                      }
                    }}
                  >
                    {isLoading && plan.tier === selectedPlan ? 'Processing...' : plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            <strong>No commitment:</strong> You can upgrade or downgrade your plan at any time.
          </p>
          <p className="text-xs text-muted-foreground">
            All paid plans include a 7-day free trial. Cancel anytime.
          </p>
          <p className="text-xs text-muted-foreground">
            Secure payment processing by Stripe
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
