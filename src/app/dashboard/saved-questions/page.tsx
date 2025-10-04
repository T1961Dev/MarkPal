"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { 
  Bookmark, 
  Search, 
  Target, 
  Calendar,
  Award,
  Eye,
  Trash2,
  ArrowRight,
  Clock,
  Layers
} from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { SavedQuestionVersionsDialog } from "@/components/saved-question-versions-dialog"

interface SavedQuestion {
  id: string
  name: string
  question: string
  mark_scheme: string
  student_answer: string
  score: number
  max_score: number
  highlights: Array<{
    text: string
    type: "success" | "warning" | "error"
    tooltip?: string
  }>
  analysis?: {
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
    missingPoints: string[]
  }
  detailed_feedback?: string
  question_id?: string
  attempt_id?: string
  version_number: number
  created_at: string
  subject?: string
  topic?: string
  difficulty?: string
}

function SavedQuestionsContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false)
  const [selectedQuestionVersions, setSelectedQuestionVersions] = useState<SavedQuestion[]>([])
  const [selectedQuestionName, setSelectedQuestionName] = useState("")

  useEffect(() => {
    if (user) {
      fetchSavedQuestions()
    }
  }, [user])

  // Add a refresh function for when questions are updated
  const refreshSavedQuestions = () => {
    if (user) {
      fetchSavedQuestions()
    }
  }


  const fetchSavedQuestions = async () => {
    try {
      setLoading(true)
      const { getSavedQuestions } = await import('@/lib/supabase')
      const questions = await getSavedQuestions(user!.id)
      setSavedQuestions(questions)
    } catch (error) {
      console.error('Error fetching saved questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const { deleteSavedQuestion } = await import('@/lib/supabase')
      await deleteSavedQuestion(questionId, user!.id)
      setSavedQuestions(prev => prev.filter(q => q.id !== questionId))
    } catch (error) {
      console.error('Error deleting question:', error)
    }
  }

  const handleViewQuestion = (questionId: string) => {
    router.push(`/dashboard/saved-questions/${questionId}`)
  }


  const handleViewVersions = (questionKey: string, questionName: string) => {
    const versions = groupedQuestions[questionKey] || []
    setSelectedQuestionVersions(versions)
    setSelectedQuestionName(questionName)
    setVersionsDialogOpen(true)
  }

  const handleCloseVersionsDialog = () => {
    setVersionsDialogOpen(false)
    setSelectedQuestionVersions([])
    setSelectedQuestionName("")
  }

  const handleImproveVersion = (version: SavedQuestion) => {
    if (version.question_id) {
      // Navigate to question bank with the specific question and attempt
      window.open(`/question-bank/${version.question_id}?attempt=${version.attempt_id}`, '_blank')
    }
  }

  const handleStartFresh = (questionId: string) => {
    // Navigate to question bank with fresh start
    window.open(`/question-bank/${questionId}?fresh=true`, '_blank')
  }

  const filteredQuestions = savedQuestions.filter(question =>
    question.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (question.subject && question.subject.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Group questions by question_id or name for version display
  const groupedQuestions = filteredQuestions.reduce((groups, question) => {
    const key = question.question_id || question.name
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(question)
    return groups
  }, {} as Record<string, SavedQuestion[]>)

  // Sort each group by version number (newest first)
  Object.keys(groupedQuestions).forEach(key => {
    groupedQuestions[key].sort((a, b) => b.version_number - a.version_number)
  })

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
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
            <h1 className="text-3xl font-bold">Saved Questions</h1>
            <p className="text-muted-foreground mt-2">
              Review your past practice sessions and track your progress
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/practice" prefetch={true}>
              <Target className="h-4 w-4 mr-2" />
              New Practice
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search saved questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredQuestions.length} questions found
          </div>
        </div>

        {/* Questions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-20 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedQuestions).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedQuestions).map(([key, questions]) => {
              const latestQuestion = questions[0] // Most recent version
              const hasMultipleVersions = questions.length > 1
              
              return (
                <Card 
                  key={key} 
                  className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => handleViewQuestion(latestQuestion.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2 mb-2">
                          {latestQuestion.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(latestQuestion.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {hasMultipleVersions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewVersions(key, latestQuestion.name)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View all versions"
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteQuestion(latestQuestion.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={getScoreBadgeVariant(latestQuestion.score, latestQuestion.max_score)}>
                        {latestQuestion.score}/{latestQuestion.max_score}
                      </Badge>
                      {latestQuestion.subject && (
                        <Badge variant="outline" className="text-xs">
                          {latestQuestion.subject}
                        </Badge>
                      )}
                      {latestQuestion.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {latestQuestion.difficulty}
                        </Badge>
                      )}
                      {hasMultipleVersions && (
                        <Badge variant="secondary" className="text-xs">
                          {questions.length} versions
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {latestQuestion.question}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Score</span>
                        <span className={`font-medium ${getScoreColor(latestQuestion.score, latestQuestion.max_score)}`}>
                          {Math.round((latestQuestion.score / latestQuestion.max_score) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(latestQuestion.score / latestQuestion.max_score) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Award className="h-3 w-3" />
                        {latestQuestion.highlights.length} feedback points
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Click to view
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No saved questions yet</p>
                <p className="text-sm mb-4">
                  {searchTerm 
                    ? "No questions match your search criteria" 
                    : "Start practicing to save your questions and track your progress"
                  }
                </p>
                {!searchTerm && (
                  <Button asChild>
                    <Link href="/dashboard/practice" prefetch={true}>
                      <Target className="h-4 w-4 mr-2" />
                      Start Practicing
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary */}
        {savedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Progress Summary</CardTitle>
              <CardDescription>
                Your overall performance across all saved questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {savedQuestions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Questions
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(
                      savedQuestions.reduce((acc, q) => acc + (q.score / q.max_score), 0) / savedQuestions.length * 100
                    )}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Average Score
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {savedQuestions.filter(q => (q.score / q.max_score) >= 0.8).length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    High Scores (80%+)
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {savedQuestions.reduce((acc, q) => acc + q.highlights.length, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Feedback Points
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Versions Dialog */}
        <SavedQuestionVersionsDialog
          isOpen={versionsDialogOpen}
          onClose={handleCloseVersionsDialog}
          questionName={selectedQuestionName}
          versions={selectedQuestionVersions}
          onImproveVersion={handleImproveVersion}
          onStartFresh={handleStartFresh}
        />
      </div>
    </DashboardLayout>
  )
}

export default function SavedQuestions() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Saved Questions</h1>
              <p className="text-muted-foreground mt-2">
                Your personalized question collection
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading saved questions...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    }>
      <SavedQuestionsContent />
    </Suspense>
  )
}
