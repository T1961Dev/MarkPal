"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Star, Zap, Crown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface PricingPopupProps {
  isOpen: boolean
  onClose: () => void
  currentTier: 'free' | 'basic' | 'pro' | 'pro+'
}

const plans = [
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
      '20 questions per month'
    ],
    buttonText: 'Upgrade to Basic',
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
      '50 questions per month'
    ],
    buttonText: 'Upgrade to Pro',
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
      '<strong>Save papers</strong> - Store and organize uploaded exam papers'
    ],
    buttonText: 'Upgrade to Pro+',
    popular: false
  }
]

export function PricingPopup({ isOpen, onClose, currentTier }: PricingPopupProps) {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'pro+' | null>(null)
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-7xl w-full max-h-[80vh] overflow-y-auto p-6"
        style={{ maxWidth: '80vw', width: '80vw' }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Upgrade Your Plan
          </DialogTitle>
          <p className="text-center text-muted-foreground text-sm">
            Choose the perfect plan for your learning journey
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = plan.tier === currentTier
            const isUpgradeable = !isCurrentPlan
            const IconComponent = plan.icon
            
            return (
              <Card 
                key={plan.tier}
                className={`relative ${
                  isCurrentPlan 
                    ? 'border-muted bg-muted/50' 
                    : plan.popular
                    ? 'border-primary shadow-lg'
                    : 'hover:shadow-md transition-shadow'
                }`}
              >
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Current Plan
                  </Badge>
                )}
                {plan.popular && !isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2" variant="default">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-muted">
                      <IconComponent className="w-6 h-6 text-muted-foreground" />
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
                    variant={isCurrentPlan ? "secondary" : "default"}
                    disabled={isCurrentPlan || isLoading}
                    onClick={() => {
                      if (isUpgradeable) {
                        setSelectedPlan(plan.tier)
                        handleUpgrade(plan.tier)
                      }
                    }}
                  >
                    {isLoading && plan.tier === selectedPlan ? 'Processing...' : 
                     isCurrentPlan ? 'Current Plan' : plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
          <p className="text-xs text-muted-foreground">
            Secure payment processing by Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}