"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Clock, Eye, RotateCcw, FileText } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { MarkSchemeDialog } from "@/components/mark-scheme-dialog"

interface Question {
  id: string
  question: string
  subject: string
  topic: string
  level: string
  marks: number
  mark_scheme: string
  question_type: string
  difficulty: string
  created_at: string
}

interface QuestionAttempt {
  id: string
  created_at: string
  score?: number
  max_score?: number
}

interface QuestionBankCardProps {
  question: Question
  getDifficultyColor: (difficulty: string) => string
  getLevelColor: (level: string) => string
  attemptStatus?: {
    hasAttempted: boolean
    latestAttempt?: QuestionAttempt
    attemptCount: number
  }
}

export function QuestionBankCard({ question, getDifficultyColor, getLevelColor, attemptStatus: propAttemptStatus }: QuestionBankCardProps) {
  const { user } = useAuth()
  const [attemptStatus, setAttemptStatus] = useState<{
    hasAttempted: boolean
    latestAttempt?: QuestionAttempt
    attemptCount: number
  } | null>(propAttemptStatus || null)
  const [loading, setLoading] = useState(!propAttemptStatus)

  useEffect(() => {
    if (propAttemptStatus) {
      setAttemptStatus(propAttemptStatus)
      setLoading(false)
    } else if (user && !propAttemptStatus) {
      // Only fetch if no prop status is provided
      fetchAttemptStatus()
    } else {
      setLoading(false)
    }
  }, [user, question.id, propAttemptStatus])

  const fetchAttemptStatus = async () => {
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      // Use a more efficient endpoint that only returns what we need
      const response = await fetch(`/api/questions/${question.id}/attempt-status`, {
        headers: {
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        cache: 'force-cache', // Cache the response
        next: { revalidate: 60 } // Revalidate every 60 seconds
      })
      const data = await response.json()
      
      if (data.success) {
        setAttemptStatus(data.data)
      }
    } catch (error) {
      console.error('Error fetching attempt status:', error)
      // Set a default state on error to prevent infinite loading
      setAttemptStatus({ hasAttempted: false, attemptCount: 0 })
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <Card className="h-full cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={getDifficultyColor(question.difficulty)}>
              {question.difficulty}
            </Badge>
            <Badge className={getLevelColor(question.level)}>
              {question.level}
            </Badge>
            {attemptStatus?.hasAttempted && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Attempted
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MarkSchemeDialog 
              questionNumber={question.id} 
              markScheme={question.mark_scheme} 
              maxMarks={question.marks}
            >
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <FileText className="h-3 w-3" />
              </Button>
            </MarkSchemeDialog>
            <Badge variant="outline" className="text-xs">
              {question.marks} marks
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          {question.subject} • {question.topic}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm font-medium line-clamp-4 leading-relaxed">
          {question.question}
        </p>
        
        {/* Attempt Status Section */}
        {loading ? (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
              <div className="h-3 bg-muted rounded w-1/4 animate-pulse"></div>
            </div>
          </div>
        ) : attemptStatus?.hasAttempted ? (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last attempted {formatDate(attemptStatus.latestAttempt?.created_at || '')}
              </div>
              {attemptStatus.latestAttempt?.score !== undefined && attemptStatus.latestAttempt?.max_score && (
                <span className={`font-medium ${getScoreColor(attemptStatus.latestAttempt.score, attemptStatus.latestAttempt.max_score)}`}>
                  {attemptStatus.latestAttempt.score}/{attemptStatus.latestAttempt.max_score}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1 text-xs">
                <Link href={`/question-bank/${question.id}`}>
                  <Eye className="h-3 w-3 mr-1" />
                  View/Improve
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
                <Link href={`/question-bank/${question.id}?fresh=true`}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Start Fresh
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Click to practice
              </span>
              <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
