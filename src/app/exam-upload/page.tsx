"use client"

import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ExamUploadSection } from "@/components/exam-upload-section"
import { PricingPopup } from "@/components/pricing-popup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { getUser, User as UserType } from "@/lib/supabase"

export default function ExamUploadPage() {
  const { user, session } = useAuth()
  const [userData, setUserData] = useState<UserType | null>(null)
  const [showPricing, setShowPricing] = useState(false)

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (user && session) {
        try {
          const data = await getUser(user.id, session.access_token)
          setUserData(data)
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
    }

    loadUserData()
  }, [user, session])

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Exam Paper Upload</h1>
          <p className="text-muted-foreground mt-2">
            Upload full exam papers and extract questions automatically
          </p>
        </div>

        {/* Exam Upload Section */}
        <ExamUploadSection 
          onQuestionsExtracted={(questions, fullText, metadata) => {
            console.log('Questions extracted:', questions)
          }}
          onError={(error) => {
            console.error('Upload error:', error)
          }}
        />

        {/* Pro+ Features Section - Only show for non-Pro+ users */}
        {userData?.tier !== 'pro+' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Pro+ Features</h2>
              <p className="text-muted-foreground">
                Unlock advanced exam paper processing capabilities
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="text-3xl mb-2">📄</div>
                  <CardTitle className="text-lg">Paper Upload</CardTitle>
                  <CardDescription>
                    Upload full exam papers in PDF format
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="text-3xl mb-2">🤖</div>
                  <CardTitle className="text-lg">AI Extraction</CardTitle>
                  <CardDescription>
                    Automatically extract questions using AI
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="text-3xl mb-2">💾</div>
                  <CardTitle className="text-lg">Save Papers</CardTitle>
                  <CardDescription>
                    Store and organize your uploaded papers
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={() => setShowPricing(true)}
                size="lg"
              >
                Upgrade to Pro+
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pricing Popup */}
      <PricingPopup 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
        currentTier={userData?.tier || 'free'} 
      />
    </DashboardLayout>
  )
}
