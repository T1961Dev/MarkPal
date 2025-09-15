"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  Target, 
  FileText, 
  PenTool, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Brain,
  Clock
} from "lucide-react"
import { MarkSchemeDialog } from "@/components/mark-scheme-dialog"
import { ImageUpload } from "@/components/image-upload"
import { LiveAnswerInput } from "@/components/live-answer-input"
import { SaveQuestionDialog } from "@/components/save-question-dialog"
import { ValidationPopup } from "@/components/validation-popup"
import { AnswerHighlighter } from "@/components/answer-highlighter"
import { ProgressButton } from "@/components/progress-button"
import { toast } from "sonner"
import { PricingPopup } from "@/components/pricing-popup"
import { getUser, User as UserType, saveQuestion } from "@/lib/supabase"

interface FeedbackResult {
  score: number
  maxScore: number
  highlights: Array<{
    text: string
    type: "success" | "warning" | "error"
    tooltip?: string
  }>
  markScheme: string
  question: string
  analysis?: {
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
    missingPoints: string[]
  }
  detailedFeedback?: string
}

export default function Practice() {
  const { user, session } = useAuth()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [question, setQuestion] = useState("")
  const [markScheme, setMarkScheme] = useState("")
  const [studentAnswer, setStudentAnswer] = useState("")
  const [maxMarks, setMaxMarks] = useState("")
  const [questionImage, setQuestionImage] = useState("")
  const [markSchemeImage, setMarkSchemeImage] = useState("")
  const [showMarkScheme, setShowMarkScheme] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null)
  const [validationPopup, setValidationPopup] = useState<{message: string, isVisible: boolean}>({message: "", isVisible: false})
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [userData, setUserData] = useState<UserType | null>(null)
  const [pricingPopupOpen, setPricingPopupOpen] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(false)

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

  const showValidationMessage = (message: string) => {
    setValidationPopup({ message, isVisible: true })
  }

  const checkAuthAndProceed = (action: () => void) => {
    if (!user) {
      window.location.href = '/'
      return
    }
    action()
  }

  const nextSlide = () => {
    if (isAnimating) return
    
    checkAuthAndProceed(() => {
      // Check if user has questions left when moving from slide 0 to slide 1
      if (currentSlide === 0 && userData && userData.questionsLeft <= 0) {
        setPricingPopupOpen(true)
        return
      }
      
      // Validate current slide before proceeding
      if (currentSlide === 0 && !question.trim() && !questionImage) {
        showValidationMessage("Please enter your question or upload an image before continuing")
        return
      }
      if (currentSlide === 1 && !markScheme.trim() && !markSchemeImage) {
        showValidationMessage("Please enter the mark scheme or upload an image before continuing")
        return
      }
      if (currentSlide === 2 && !studentAnswer.trim()) {
        showValidationMessage("Please enter your answer before continuing")
        return
      }
      
      setIsAnimating(true)
      setCurrentSlide((prev) => Math.min(prev + 1, 3))
      setTimeout(() => setIsAnimating(false), 500)
    })
  }

  const prevSlide = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
    setTimeout(() => setIsAnimating(false), 500)
  }

  const handleKeyPress = (e: React.KeyboardEvent, slideIndex: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (slideIndex < 3) {
        nextSlide()
      } else if (slideIndex === 2) {
        handleEvaluate()
      }
    }
  }

  // AI Processing Function
  const processFeedback = async (question: string, markScheme: string, studentAnswer: string, maxMarks: number, questionImg?: string, markSchemeImg?: string): Promise<FeedbackResult> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout for faster UX
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question || undefined,
          markScheme: markScheme || undefined,
          studentAnswer,
          maxMarks,
          questionImage: questionImg || undefined,
          markSchemeImage: markSchemeImg || undefined,
          userId: user?.id,
          accessToken: session?.access_token
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 403 && errorData.code === 'NO_QUESTIONS_LEFT') {
          throw new Error('No questions remaining. Please upgrade your plan to continue.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }

      return result.data
    } catch (error) {
      console.error('Error calling analysis API:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Analysis timed out. Please try again.')
      }
      
      // Fast fallback analysis
      const answerLength = studentAnswer.length
      const questionLength = question.length
      const markSchemeLength = markScheme.length
      
      // Simple scoring based on answer length and content
      const lengthScore = Math.min(maxMarks * 0.6, Math.floor(answerLength / 50))
      const contentScore = Math.min(maxMarks * 0.4, Math.floor((answerLength / Math.max(questionLength, 1)) * maxMarks * 0.4))
      const finalScore = Math.min(maxMarks, Math.round(lengthScore + contentScore))
      
      // Simple highlights
      const highlights: Array<{text: string, type: "success" | "warning" | "error", tooltip?: string}> = []
      
      if (answerLength > 100) {
        highlights.push({
          text: "Good answer length",
          type: "success"
        })
      } else if (answerLength > 50) {
        highlights.push({
          text: "Answer could be longer",
          type: "warning",
          tooltip: "Consider adding more detail to your answer"
        })
      } else {
        highlights.push({
          text: "Answer is too short",
          type: "error",
          tooltip: "Your answer needs more detail and explanation"
        })
      }

      return {
        score: finalScore,
        maxScore: maxMarks,
        highlights,
        markScheme,
        question
      }
    }
  }

  const handleEvaluate = async () => {
    if ((!question.trim() && !questionImage) || !studentAnswer.trim()) return
    
    checkAuthAndProceed(async () => {
      // Check if user has questions left before evaluating
      if (userData && userData.questionsLeft <= 0) {
        setPricingPopupOpen(true)
        return
      }
      setIsProcessing(true)
      setShowFeedback(false)
      
      try {
        const maxMarksValue = parseInt(maxMarks) || 10
        const result = await processFeedback(question, markScheme, studentAnswer, maxMarksValue, questionImage, markSchemeImage)
        
        setFeedbackResult(result)
        setShowFeedback(true)
        setCurrentSlide(3)
        
        // Refresh questions progress
        window.dispatchEvent(new Event('questionsUsed'))
      } catch (error) {
        console.error('Error processing feedback:', error)
        showValidationMessage("Failed to analyze your answer. Please try again.")
      } finally {
        setIsProcessing(false)
      }
    })
  }

  const handleSaveQuestion = async (name: string) => {
    if (!user || !feedbackResult) return
    
    setSavingQuestion(true)
    try {
      const savedQuestion = await saveQuestion({
        user_id: user.id,
        name,
        question: feedbackResult.question,
        mark_scheme: feedbackResult.markScheme,
        student_answer: studentAnswer,
        score: feedbackResult.score,
        max_score: feedbackResult.maxScore,
        highlights: feedbackResult.highlights,
        analysis: feedbackResult.analysis || {
          strengths: [],
          weaknesses: [],
          improvements: [],
          missingPoints: []
        },
        detailed_feedback: feedbackResult.detailedFeedback || "",
        version_number: 1
      })
      
      setSaveDialogOpen(false)
      
      // Show success notification with link to view the saved question
      toast.success("Question saved successfully!", {
        description: (
          <div className="flex items-center gap-2">
            <span>Your question has been saved.</span>
            <button
              onClick={() => window.open(`/dashboard/saved-questions?view=${savedQuestion.id}`, '_blank')}
              className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
            >
              Click to view the question
            </button>
          </div>
        ),
        duration: 6000,
      });
    } catch (error) {
      console.error('Error saving question:', error)
      toast.error("Failed to save question. Please try again.")
    } finally {
      setSavingQuestion(false)
    }
  }

  const FeedbackHighlight = ({ text, type, tooltip }: { text: string; type: string; tooltip?: string }) => {
    const getHighlightClass = () => {
      switch (type) {
        case "success":
          return "highlight-success"
        case "warning":
          return "highlight-warning"
        case "error":
          return "highlight-error"
        default:
          return ""
      }
    }

    const getIcon = () => {
      switch (type) {
        case "success":
          return <CheckCircle className="w-3 h-3 text-secondary inline ml-1" />
        case "warning":
          return <AlertCircle className="w-3 h-3 text-yellow-500 inline ml-1" />
        case "error":
          return <XCircle className="w-3 h-3 text-destructive inline ml-1" />
        default:
          return null
      }
    }

    if (tooltip) {
      return (
        <span className={`${getHighlightClass()} relative group`} title={tooltip}>
          {text}
          {getIcon()}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
          </div>
        </span>
      )
    }

    return (
      <span className={getHighlightClass()}>
        {text}
        {getIcon()}
      </span>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <DashboardLayout>
      <ValidationPopup message={validationPopup.message} isVisible={validationPopup.isVisible} onClose={() => setValidationPopup({...validationPopup, isVisible: false})} />
      <SaveQuestionDialog 
        isOpen={saveDialogOpen} 
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveQuestion}
        onDiscard={() => setSaveDialogOpen(false)}
        isLoading={savingQuestion}
      />
      <PricingPopup 
        isOpen={pricingPopupOpen} 
        onClose={() => setPricingPopupOpen(false)}
        currentTier={userData?.tier || 'free'}
      />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Practice Mode</h1>
            <p className="text-muted-foreground mt-2">
              Get instant AI feedback on your answers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {userData?.questionsLeft || 0} questions left
            </Badge>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4">
          {[0, 1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentSlide 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step + 1}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  step < currentSlide ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Practice Content */}
        <div className="max-w-4xl mx-auto">
          {currentSlide === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Step 1: Enter Your Question
                </CardTitle>
                <CardDescription>
                  Paste the exam question you want to practice with
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Textarea
                  placeholder="e.g., Explain the process of photosynthesis and its importance to life on Earth. (10 marks)"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 0)}
                  className="min-h-[150px] text-lg"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <ImageUpload
                    onImageUpload={setQuestionImage}
                    onImageRemove={() => setQuestionImage("")}
                    currentImage={questionImage}
                  />
                  <Button onClick={nextSlide} disabled={isAnimating}>
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSlide === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Step 2: Enter Mark Scheme
                </CardTitle>
                <CardDescription>
                  Paste the official mark scheme or marking criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Textarea
                  placeholder="e.g., Level 3 (7-10 marks): Detailed explanation including reactants, products, and energy conversion..."
                  value={markScheme}
                  onChange={(e) => setMarkScheme(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 1)}
                  className="min-h-[150px] text-lg"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={prevSlide} disabled={isAnimating}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    {markScheme.trim() && (
                      <MarkSchemeDialog 
                        questionNumber="Preview" 
                        markScheme={markScheme} 
                        maxMarks={parseInt(maxMarks) || 10}
                      >
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview Mark Scheme
                        </Button>
                      </MarkSchemeDialog>
                    )}
                    <ImageUpload
                      onImageUpload={setMarkSchemeImage}
                      onImageRemove={() => setMarkSchemeImage("")}
                      currentImage={markSchemeImage}
                    />
                  </div>
                  <Button onClick={nextSlide} disabled={isAnimating}>
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSlide === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Step 3: Write Your Answer
                </CardTitle>
                <CardDescription>
                  Write your best attempt at answering the question
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Textarea
                  placeholder="e.g., Photosynthesis is the process where plants make food using sunlight and water to produce glucose and oxygen..."
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 2)}
                  className="min-h-[180px] text-lg"
                  autoFocus
                />
                <div className="flex items-center justify-center gap-4">
                  <Label htmlFor="maxMarks" className="text-lg font-medium">
                    Max Marks:
                  </Label>
                  <Input
                    id="maxMarks"
                    type="number"
                    placeholder="10"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    className="w-24 text-lg"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={prevSlide} disabled={isAnimating}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <ProgressButton 
                    onClick={handleEvaluate}
                    disabled={!question || !studentAnswer || !markScheme || isProcessing}
                    className="bg-primary hover:bg-primary/90"
                    duration={6000}
                    icon={<Sparkles className="w-4 h-4 mr-2" />}
                  >
                    Get Feedback
                  </ProgressButton>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSlide === 3 && showFeedback && feedbackResult && (
            <div className="space-y-6">
              {/* Score Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-4">Your Score</h3>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-4xl font-bold text-primary">{feedbackResult.score}</div>
                      <div className="text-2xl text-muted-foreground">/ {feedbackResult.maxScore}</div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {Math.round((feedbackResult.score / feedbackResult.maxScore) * 100)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-secondary" />
                    Your Answer with Feedback
                  </CardTitle>
                  <CardDescription>
                    Hover over highlighted sections for improvement suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg leading-relaxed max-h-[400px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
                    <AnswerHighlighter 
                      answerText={studentAnswer}
                      highlights={feedbackResult.highlights || []}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Strengths and Improvements */}
              {feedbackResult.analysis && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                  {/* Strengths */}
                  {feedbackResult.analysis.strengths && feedbackResult.analysis.strengths.length > 0 && (
                    <Card className="rounded-2xl border-2 border-green-200 bg-green-50/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          What You Did Well
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {feedbackResult.analysis.strengths.map((strength, index) => (
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
                  {feedbackResult.analysis.improvements && feedbackResult.analysis.improvements.length > 0 && (
                    <Card className="rounded-2xl border-2 border-orange-200 bg-orange-50/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl flex items-center gap-2 text-orange-700">
                          <Target className="w-5 h-5" />
                          How to Improve
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {feedbackResult.analysis.improvements.map((improvement, index) => (
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

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => setSaveDialogOpen(true)}
                  variant="outline"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Question
                </Button>
                <Button
                  onClick={() => {
                    setCurrentSlide(0)
                    setShowFeedback(false)
                    setFeedbackResult(null)
                    setQuestion("")
                    setMarkScheme("")
                    setStudentAnswer("")
                    setMaxMarks("")
                    setQuestionImage("")
                    setMarkSchemeImage("")
                  }}
                >
                  Try Another Question
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
