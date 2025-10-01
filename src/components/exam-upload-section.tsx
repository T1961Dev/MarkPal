"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, Lock, FileText, Crown } from "lucide-react"
import { ExamUploadFlow } from "@/components/exam-upload-flow"
import { PricingPopup } from "@/components/pricing-popup"
import { getUser, User } from "@/lib/supabase"

interface ExtractedQuestion {
  question: string
  mark_scheme: string
  marks: number
  question_type: string
  difficulty: string
}

interface PDFMetadata {
  title: string
  creator: string
  creationDate?: string
  modificationDate?: string
}

interface ExamUploadSectionProps {
  onQuestionsExtracted?: (questions: ExtractedQuestion[], fullText: string, metadata: PDFMetadata) => void
  onError?: (error: string) => void
}

export function ExamUploadSection({ onQuestionsExtracted, onError }: ExamUploadSectionProps) {
  const { user } = useAuth()
  const [showPricing, setShowPricing] = useState(false)
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

  const handleUpgradeClick = () => {
    setShowPricing(true)
  }

  const isUserProPlus = userData?.tier === 'pro+'

  if (!isUserProPlus) {
    return (
      <>
        <Card className="relative overflow-hidden">
          {/* Blur overlay */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Exam Paper Upload</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload full exam papers and extract questions automatically
                </p>
                <Button onClick={handleUpgradeClick} className="gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Pro+
                </Button>
              </div>
            </div>
          </div>
          
          {/* Blurred content */}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Exam Paper Upload
            </CardTitle>
            <CardDescription>
              Upload full exam papers and extract questions automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Upload your exam paper PDF</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Supported formats: PDF (max 10MB)
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Questions will be automatically extracted and added to your question bank</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <PricingPopup 
          isOpen={showPricing} 
          onClose={() => setShowPricing(false)} 
          currentTier={userData?.tier || 'free'} 
        />
      </>
    )
  }

  return (
    <ExamUploadFlow 
      onQuestionsExtracted={onQuestionsExtracted}
      onError={onError}
    />
  )
}
