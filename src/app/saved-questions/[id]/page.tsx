"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Target,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Calendar
} from "lucide-react"
import { SavedQuestion, getSavedQuestionById } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

export default function SavedQuestionDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [question, setQuestion] = useState<SavedQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [markSchemeExpanded, setMarkSchemeExpanded] = useState(false)

  useEffect(() => {
    if (user && params.id) {
      loadQuestion()
    }
  }, [user, params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuestion = async () => {
    if (!user || !params.id) return
    
    setLoading(true)
    try {
      const questionData = await getSavedQuestionById(params.id as string, user.id)
      if (questionData) {
        setQuestion(questionData)
      } else {
        router.push('/dashboard/saved-questions')
      }
    } catch (error) {
      console.error('Error loading question:', error)
      router.push('/dashboard/saved-questions')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getHighlightClass = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
      case "warning":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
      case "error":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
    }
  }

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4" />
      case "warning":
        return <AlertCircle className="w-4 h-4" />
      case "error":
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading question...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!question) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-3">Question not found</h1>
          <Link href="/dashboard/saved-questions">
            <Button>Back to Saved Questions</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/saved-questions">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Saved Questions
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{question.name}</h1>
            <div className="flex items-center gap-3 text-muted-foreground mt-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(question.created_at)}
              </div>
              <Badge variant="secondary" className="text-sm">
                {question.score}/{question.max_score}
              </Badge>
              <div className="text-sm font-medium">
                {Math.round((question.score / question.max_score) * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Question and Mark Scheme Side by Side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Question
              </h3>
              <Card className="border-2 border-primary/10 shadow-lg">
                <CardContent className="p-3">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{question.question}</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
                <Target className="w-5 h-5" />
                Mark Scheme
              </h3>
              <Card className="border-2 border-primary/10 shadow-lg">
                <CardContent className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">Preview:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMarkSchemeExpanded(!markSchemeExpanded)}
                        className="text-primary hover:text-primary/80"
                      >
                        {markSchemeExpanded ? 'Show Less' : 'Show More'}
                      </Button>
                    </div>
                    <div className={`transition-all duration-300 ${markSchemeExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-32 overflow-hidden'}`}>
                      <p className="text-base whitespace-pre-wrap leading-relaxed">{question.mark_scheme}</p>
                    </div>
                    {!markSchemeExpanded && (
                      <div className="text-sm text-muted-foreground">
                        Click &quot;Show More&quot; to see the full mark scheme
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Answer and Analysis Side by Side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Your Answer */}
            <div>
              <h3 className="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Your Answer
              </h3>
              <Card className="border-2 border-primary/10 shadow-lg">
                <CardContent className="p-3">
                  <div className="text-base leading-relaxed space-y-3">
                    {question.highlights.map((highlight, index) => (
                      <div
                        key={index}
                        className={`${getHighlightClass(highlight.type)} px-4 py-3 rounded-lg border`}
                        title={highlight.tooltip}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getHighlightIcon(highlight.type)}
                          </div>
                          <span className="flex-1 leading-relaxed">{highlight.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Grid */}
            <div className="space-y-3">
              <Card className="border-2 border-green-200 dark:border-green-800 shadow-lg">
                <CardHeader className="pb-3">
                  <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Strengths
                  </h3>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {question.analysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-3 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200 dark:border-red-800 shadow-lg">
                <CardHeader className="pb-3">
                  <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Areas for Improvement
                  </h3>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {question.analysis.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                        <Target className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Feedback */}
          <div>
            <h3 className="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Detailed Feedback
            </h3>
            <Card className="border-2 border-primary/10 shadow-lg">
              <CardContent className="p-6">
                <p className="text-base whitespace-pre-wrap leading-relaxed">{question.detailed_feedback}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
