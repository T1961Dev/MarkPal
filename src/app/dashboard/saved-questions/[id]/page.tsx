"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MarkSchemeDialog } from "@/components/mark-scheme-dialog"
import { 
  BookOpen, 
  Target,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  ArrowLeft,
  FileText,
  Award,
  Clock,
  TrendingUp
} from "lucide-react"
import { SavedQuestion, getSavedQuestionById, getSavedQuestions } from "@/lib/supabase"
import { AnswerHighlighter } from "@/components/answer-highlighter"
import { ProgressGraph } from "@/components/progress-graph"

export default function SavedQuestionPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [question, setQuestion] = useState<SavedQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [progressVersions, setProgressVersions] = useState<SavedQuestion[]>([])

  useEffect(() => {
    if (user && params.id) {
      loadQuestion()
    }
  }, [user, params.id])

  const loadQuestion = async () => {
    if (!user || !params.id) return
    
    setLoading(true)
    try {
      // Load both question and all questions in parallel for faster loading
      const [questionData, allQuestions] = await Promise.all([
        getSavedQuestionById(params.id as string, user.id),
        getSavedQuestions(user.id)
      ])
      
      if (questionData) {
        setQuestion(questionData)
        
        // Filter versions for progress graph
        const versions = allQuestions.filter(q => 
          q.question_id === questionData.question_id || 
          (q.question_id === null && q.name === questionData.name)
        )
        setProgressVersions(versions)
      } else {
        // Question not found, redirect back
        router.push('/dashboard/saved-questions')
      }
    } catch (error) {
      console.error('Error loading question:', error)
      router.push('/dashboard/saved-questions')
    } finally {
      setLoading(false)
    }
  }

  const handleViewVersions = () => {
    router.push(`/dashboard/saved-questions/${params.id}/versions`)
  }



  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreIcon = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (percentage >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading question...</p>
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
          <p className="text-muted-foreground mb-4">The question you're looking for doesn't exist or has been deleted.</p>
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/saved-questions')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Saved Questions
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{question.name}</h1>
              <p className="text-muted-foreground">
                Version {question.version_number} • {new Date(question.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleViewVersions}
            >
              <Award className="h-4 w-4 mr-2" />
              View All Versions
            </Button>
            <Badge variant="outline" className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              {question.score}/{question.max_score} marks
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(question.created_at).toLocaleDateString()}
            </Badge>
          </div>
        </div>

        {/* Score Card */}
        <Card className="border-2 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getScoreIcon(question.score, question.max_score)}
                <div>
                  <h3 className="text-2xl font-bold">Your Score</h3>
                  <p className="text-muted-foreground">
                    {question.score} out of {question.max_score} marks
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(question.score, question.max_score)}`}>
                  {question.score}
                </div>
                <div className="text-muted-foreground">out of {question.max_score}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Graph - Show only if multiple versions exist */}
        {progressVersions.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Over Time
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Your improvement across {progressVersions.length} attempts
              </p>
            </CardHeader>
            <CardContent>
              <ProgressGraph versions={progressVersions} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="text-lg leading-relaxed whitespace-pre-wrap">
                  {question.question}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Your Answer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Your Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="text-lg leading-relaxed">
                  <AnswerHighlighter 
                    answerText={question.student_answer}
                    highlights={question.highlights || []}
                  />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Mark Scheme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mark Scheme
            </CardTitle>
            <CardDescription>
              Review the official mark scheme for this question
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong>Max Marks:</strong> {question.max_score}
              </div>
              <div className="mt-4">
                <MarkSchemeDialog 
                  questionNumber={question.name} 
                  markScheme={question.mark_scheme} 
                  maxMarks={question.max_score}
                >
                  <Button 
                    variant="outline" 
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Mark Scheme
                  </Button>
                </MarkSchemeDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis */}
        {question.analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strengths */}
            {question.analysis.strengths && question.analysis.strengths.length > 0 && (
              <Card className="border-2 border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    What You Did Well
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {question.analysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-green-800">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Improvements */}
            {question.analysis.improvements && question.analysis.improvements.length > 0 && (
              <Card className="border-2 border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2 text-orange-700">
                    <Target className="w-5 h-5" />
                    How to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {question.analysis.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-orange-800">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Detailed Feedback */}
        {question.detailed_feedback && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Detailed Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg leading-relaxed whitespace-pre-wrap">
                {question.detailed_feedback}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  )
}
