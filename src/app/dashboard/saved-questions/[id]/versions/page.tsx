"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar, 
  Award, 
  Edit3, 
  RotateCcw,
  Clock,
  ArrowLeft
} from "lucide-react"
import { SavedQuestion, getSavedQuestionById, getSavedQuestions } from "@/lib/supabase"

export default function SavedQuestionVersionsPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [question, setQuestion] = useState<SavedQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [allVersions, setAllVersions] = useState<SavedQuestion[]>([])

  useEffect(() => {
    if (user && params.id) {
      loadQuestion()
    }
  }, [user, params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuestion = async () => {
    if (!user || !params.id) return
    
    setLoading(true)
    try {
      const [questionData, allQuestions] = await Promise.all([
        getSavedQuestionById(params.id as string, user.id),
        getSavedQuestions(user.id)
      ])
      
      if (questionData) {
        setQuestion(questionData)
        
        // Filter versions for this question
        const versions = allQuestions.filter(q => 
          q.question_id === questionData.question_id || 
          (q.question_id === null && q.name === questionData.name)
        )
        setAllVersions(versions)
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
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return "default"
    if (percentage >= 60) return "secondary"
    return "destructive"
  }

  const handleImprove = (version: SavedQuestion) => {
    // Navigate to practice page with the question data
    const params = new URLSearchParams({
      question: version.question,
      markScheme: version.mark_scheme,
      maxScore: version.max_score.toString(),
      studentAnswer: version.student_answer,
      versionId: version.id
    })
    window.open(`/dashboard/practice?${params.toString()}`, '_blank')
  }

  const handleStartFresh = () => {
    // Navigate to practice page with fresh start
    const params = new URLSearchParams({
      question: question?.question || '',
      markScheme: question?.mark_scheme || '',
      maxScore: question?.max_score?.toString() || '1'
    })
    window.open(`/dashboard/practice?${params.toString()}`, '_blank')
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading versions...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!question) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Question Not Found</h1>
          <p className="text-muted-foreground mb-4">The question you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <Button onClick={() => router.push('/dashboard/saved-questions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Saved Questions
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/dashboard/saved-questions/${params.id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Question
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{question.name} - All Versions</h1>
              <p className="text-muted-foreground">
                {allVersions.length} version{allVersions.length !== 1 ? 's' : ''} • Click to improve
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleStartFresh}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Fresh Attempt
            </Button>
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Latest: {formatDate(allVersions[0]?.created_at || '')}
            </div>
          </div>
        </div>

        {/* Versions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allVersions.map((version, index) => (
            <Card 
              key={version.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow duration-150 ${
                index === 0 ? 'ring-2 ring-primary/20 bg-primary/5' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-base">
                        Version {version.version_number}
                      </CardTitle>
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(version.created_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getScoreBadgeVariant(version.score, version.max_score)}>
                    {version.score}/{version.max_score}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Score</span>
                    <span className={`font-medium ${getScoreColor(version.score, version.max_score)}`}>
                      {Math.round((version.score / version.max_score) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(version.score / version.max_score) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Award className="h-3 w-3" />
                    {version.highlights.length} feedback points
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => handleImprove(version)}
                    className="w-full"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Improve This Version
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
