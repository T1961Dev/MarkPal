"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Target, 
  FileText, 
  PenTool, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  EyeOff,
  Save,
  Brain
} from "lucide-react"
import { QuestionBankLiveInput } from "@/components/question-bank-live-input"
import { MarkSchemeDialog } from "@/components/mark-scheme-dialog"
import { ImageUpload } from "@/components/image-upload"
import { SaveQuestionDialog } from "@/components/save-question-dialog"
import { ValidationPopup } from "@/components/validation-popup"
import { AnswerHighlighter } from "@/components/answer-highlighter"
import { ProgressButton } from "@/components/progress-button"
import { toast } from "sonner"
import { PricingPopup } from "@/components/pricing-popup"
import { getUser, User as UserType, saveQuestion, getOptimisticUserData, getNextVersionNumber } from "@/lib/supabase"

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

function PracticeContent() {
  const { user, session } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [question, setQuestion] = useState("")
  const [markScheme, setMarkScheme] = useState("")
  const [studentAnswer, setStudentAnswer] = useState("")
  const [maxMarks, setMaxMarks] = useState("")
  const [questionImage, setQuestionImage] = useState("")
  const [studentAnswerImage, setStudentAnswerImage] = useState("")
  const [markSchemeImage, setMarkSchemeImage] = useState("")
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
  const [loading, setLoading] = useState(true)
  const [formattedMarkScheme, setFormattedMarkScheme] = useState<string>("")
  const [formattingMarkScheme, setFormattingMarkScheme] = useState(false)
  const [liveHighlights, setLiveHighlights] = useState<Array<{ text: string; type: "success" | "warning" | "error"; tooltip?: string }>>([])
  const [isLiveProcessing, setIsLiveProcessing] = useState(false)
  const [liveScore, setLiveScore] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  // Handle URL parameters for pre-populating form from saved questions
  useEffect(() => {
    const urlQuestion = searchParams.get('question')
    const urlMarkScheme = searchParams.get('markScheme')
    const urlMaxScore = searchParams.get('maxScore')
    const urlStudentAnswer = searchParams.get('studentAnswer')

    // Only pre-fill if we have URL parameters (coming from improvement mode)
    if (urlQuestion || urlMarkScheme || urlMaxScore || urlStudentAnswer) {
      if (urlQuestion) {
        setQuestion(urlQuestion)
      }
      if (urlMarkScheme) {
        setMarkScheme(urlMarkScheme)
      }
      if (urlMaxScore) {
        setMaxMarks(urlMaxScore)
      }
      if (urlStudentAnswer) {
        setStudentAnswer(urlStudentAnswer)
      }
    } else {
      // Clear form when navigating to practice normally
      setQuestion("")
      setMarkScheme("")
      setStudentAnswer("")
      setMaxMarks("")
      setQuestionImage("")
      setStudentAnswerImage("")
      setMarkSchemeImage("")
    }
  }, [searchParams])

  // Check if we're in improvement mode
  const isImprovementMode = searchParams.get('versionId') !== null

  // Global paste handler for images
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.startsWith('image/')) {
            e.preventDefault()
            const file = item.getAsFile()
            if (file) {
              const reader = new FileReader()
              reader.onload = (event) => {
                const result = event.target?.result as string
                // Determine which step we're on and set the appropriate image
                if (currentSlide === 0) {
                  setQuestionImage(result)
                  toast.success("Question image pasted successfully!")
                } else if (currentSlide === 1) {
                  setStudentAnswerImage(result)
                  toast.success("Answer image pasted successfully!")
                } else if (currentSlide === 2) {
                  setMarkSchemeImage(result)
                  toast.success("Mark scheme image pasted successfully!")
                }
              }
              reader.readAsDataURL(file)
            }
            break
          }
        }
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => {
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [currentSlide])


  const loadUserData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Use cached data first for instant loading
      const cachedData = getOptimisticUserData(user.id)
      if (cachedData) {
        setUserData(cachedData)
        setLoading(false)
        return
      }
      
      // Only fetch from database if no cached data
      const data = await getUser(user.id)
      setUserData(data)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMarkScheme = async () => {
    if (!markScheme || !markScheme.trim()) return
    
    try {
      setFormattingMarkScheme(true)
      const response = await fetch('/api/format-mark-scheme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markSchemeText: markScheme,
          questionText: question,
          maxMarks: parseInt(maxMarks) || 10
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setFormattedMarkScheme(result.formattedMarkScheme)
      } else {
        // Fallback to original mark scheme if formatting fails
        setFormattedMarkScheme(markScheme)
      }
    } catch (error) {
      console.error('Error formatting mark scheme:', error)
      // Fallback to original mark scheme
      setFormattedMarkScheme(markScheme)
    } finally {
      setFormattingMarkScheme(false)
    }
  }

  const showValidationMessage = (message: string) => {
    setValidationPopup({ message, isVisible: true })
  }

  const handleLiveAnalysis = async (text: string) => {
    if (!question || !markScheme || !text || !text.trim()) return

    setIsLiveProcessing(true)
    try {
      const response = await fetch('/api/mark-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          studentAnswer: text,
          markScheme: markScheme,
          maxMarks: parseInt(maxMarks) || 10
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setLiveHighlights(data.data.highlights || [])
        setLiveScore(data.data.score)
      }
    } catch (error) {
      console.error('Error in live analysis:', error)
    } finally {
      setIsLiveProcessing(false)
    }
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
      if (currentSlide === 0 && (!question || !question.trim()) && !questionImage) {
        showValidationMessage("Please upload an image or enter your question before continuing")
        return
      }
      if (currentSlide === 1 && (!studentAnswer || !studentAnswer.trim()) && !studentAnswerImage) {
        showValidationMessage("Please upload an image or enter your answer before continuing")
        return
      }
      if (currentSlide === 2 && (!markScheme || !markScheme.trim()) && !markSchemeImage) {
        showValidationMessage("Please enter the mark scheme or upload an image before continuing")
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
      if (slideIndex === 0 || slideIndex === 1) {
        nextSlide()
      } else if (slideIndex === 2) {
        handleEvaluate()
      }
    }
  }

  // AI Processing Function
  const processFeedback = async (question: string, markScheme: string, studentAnswer: string, maxMarks: number, questionImg?: string, markSchemeImg?: string, studentAnswerImg?: string): Promise<FeedbackResult> => {
    try {
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
          studentAnswerImage: studentAnswerImg,
          userId: user?.id,
          accessToken: session?.access_token
        }),
      })

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
        throw new Error('Analysis timed out. Please try again with a shorter answer.')
      }
      
      // Fast fallback analysis
      const answerLength = studentAnswer.length
      const questionLength = question.length
      
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
    if ((!question || !question.trim()) && !questionImage || (!studentAnswer || !studentAnswer.trim()) && !studentAnswerImage) return
    
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
        const result = await processFeedback(question, markScheme, studentAnswer, maxMarksValue, questionImage, markSchemeImage, studentAnswerImage)
        
      setFeedbackResult(result)
      setShowFeedback(true)
      setCurrentSlide(3)
      
      // Format the mark scheme for better display
      await formatMarkScheme()
        
        // Refresh questions progress
        window.dispatchEvent(new Event('questionsUsed'))
      } catch (error) {
        console.error('Error processing feedback:', error)
        console.error('Error details:', error)
        if (error instanceof Error) {
          showValidationMessage(`Failed to analyze your answer: ${error.message}`)
        } else {
          showValidationMessage("Failed to analyze your answer. Please try again.")
        }
      } finally {
        setIsProcessing(false)
      }
    })
  }

  const handleSaveLiveQuestion = async () => {
    if (!user || !question || !markScheme || !studentAnswer || liveScore === null) return
    
    setSavingQuestion(true)
    try {
      // Check if we're improving an existing saved question
      const urlVersionId = searchParams.get('versionId')
      let finalName = "Improved Answer"
      
      // If we have a versionId, we're improving an existing question
      // Look up the original saved question to get its name
      if (urlVersionId) {
        try {
          const { getSavedQuestionById } = await import('@/lib/supabase')
          const originalQuestion = await getSavedQuestionById(urlVersionId, user.id)
          if (originalQuestion) {
            finalName = originalQuestion.name
          }
        } catch (error) {
          console.error('Error fetching original question:', error)
        }
      }
      
      // Get the next version number
      const versionNumber = await getNextVersionNumber(user.id, undefined, finalName)
      
      const savedQuestion = await saveQuestion({
        user_id: user.id,
        name: finalName,
        question: question,
        mark_scheme: markScheme,
        student_answer: studentAnswer,
        score: liveScore,
        max_score: parseInt(maxMarks) || 10,
        highlights: liveHighlights,
        analysis: {
          strengths: [],
          weaknesses: [],
          improvements: [],
          missingPoints: []
        },
        detailed_feedback: "",
        version_number: versionNumber
      }, session?.access_token)
      
      // Show success and redirect
      toast.success("Question saved successfully!", {
        description: "Your improved answer has been saved as a new version.",
        duration: 3000,
      })
      
      // Redirect to the saved question
      router.push(`/dashboard/saved-questions/${savedQuestion.id}`)
      
    } catch (error) {
      console.error('Error saving live question:', error)
      toast.error("Failed to save question. Please try again.")
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleSaveQuestion = async (name: string) => {
    if (!user || !feedbackResult) return
    
    setSavingQuestion(true)
    try {
      // Check if we're improving an existing saved question
      const urlVersionId = searchParams.get('versionId')
      let finalName = name
      
      // If we have a versionId, we're improving an existing question
      // Look up the original saved question to get its name for proper version grouping
      if (urlVersionId) {
        try {
          const { getSavedQuestionById } = await import('@/lib/supabase')
          const originalQuestion = await getSavedQuestionById(urlVersionId, user.id)
          if (originalQuestion) {
            // Use the original question's name to keep all versions grouped together
            finalName = originalQuestion.name
          }
        } catch (error) {
          console.error('Error fetching original question:', error)
          // Continue with provided name if we can&apos;t fetch the original
        }
      }
      
      // Get the next version number for this question (grouped by name for practice questions)
      const versionNumber = await getNextVersionNumber(user.id, undefined, finalName)
      
      const savedQuestion = await saveQuestion({
        user_id: user.id,
        name: finalName,
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
        version_number: versionNumber
      }, session?.access_token)
      
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

  /* Unused component - keeping for potential future use
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
  */

  if (!user || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
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
            {userData ? (
              <Badge variant="secondary" className="flex items-center">
                {userData.tier === 'pro+' ? <><span className="text-xl">∞</span> <span className="ml-1">questions left</span></> : `${userData.questionsLeft} questions left`}
              </Badge>
            ) : (
              <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
            )}
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

        {/* Improvement Mode Indicator */}
        {isImprovementMode && (
          <div className="max-w-4xl mx-auto mb-6">
            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Improvement Mode</h3>
                    <p className="text-sm text-blue-700">
                      You&apos;re improving a previous answer. {isLiveMode ? 'Live analysis is enabled - your score updates as you type.' : 'Enable live analysis for real-time feedback.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                  Upload an image of your exam question or type it manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary: Image Upload */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Upload Question Image</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Take a photo, upload an image, or press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+V</kbd> to paste
                    </p>
                  </div>
                  <ImageUpload
                    onImageUpload={setQuestionImage}
                    onImageRemove={() => setQuestionImage("")}
                    currentImage={questionImage}
                    className="min-h-[200px] border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors"
                  />
                </div>

                {/* Secondary: Text Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Or type your question manually</span>
                  </div>
                  <Textarea
                    placeholder="Type your question here if you prefer text input..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, 0)}
                    className="min-h-[100px] text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {questionImage ? "Image uploaded" : (question && question.trim()) ? "Text entered" : "Upload image or enter text"}
                  </div>
                  <Button onClick={nextSlide} disabled={isAnimating || ((!question || !question.trim()) && !questionImage)}>
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
                  <PenTool className="h-5 w-5" />
                  Step 2: Write Your Answer
                </CardTitle>
                <CardDescription>
                  Upload an image of your written answer or type it manually
                </CardDescription>
                {isImprovementMode && studentAnswer && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Previous Answer (for reference)</span>
                    </div>
                    <p className="text-sm text-amber-700 bg-white p-2 rounded border">
                      {studentAnswer}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary: Image Upload */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Upload Your Answer</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Take a photo, upload an image, or press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+V</kbd> to paste
                    </p>
                  </div>
                  <ImageUpload
                    onImageUpload={setStudentAnswerImage}
                    onImageRemove={() => setStudentAnswerImage("")}
                    currentImage={studentAnswerImage}
                    className="min-h-[200px] border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors"
                  />
                </div>

                {/* Secondary: Text Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Or type your answer manually</span>
                  </div>
                  {isLiveMode ? (
                    <QuestionBankLiveInput
                      value={studentAnswer}
                      onChange={setStudentAnswer}
                      onAnalysis={handleLiveAnalysis}
                      highlights={liveHighlights}
                      isLoading={isLiveProcessing}
                      score={liveScore}
                      maxScore={parseInt(maxMarks) || 10}
                      placeholder="Type your improved answer here for live analysis..."
                      onSave={handleSaveLiveQuestion}
                      isSaving={savingQuestion}
                    />
                  ) : (
                    <Textarea
                      placeholder="Type your answer here if you prefer text input..."
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, 1)}
                      className="min-h-[100px] text-sm"
                    />
                  )}
                </div>

                {/* Live Analysis Toggle - Pro+ Only and Improvement Mode Only */}
                {userData?.tier === 'pro+' && isImprovementMode && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Brain className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-purple-900">Live Analysis Mode</h4>
                        <p className="text-sm text-purple-700">
                          Get real-time AI marking as you type - see your score and highlights instantly
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={isLiveMode ? "default" : "outline"}
                      onClick={() => setIsLiveMode(!isLiveMode)}
                      className="shrink-0"
                    >
                      {isLiveMode ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Disable Live Mode
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Enable Live Mode
                        </>
                      )}
                    </Button>
                  </div>
                )}

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
                  <div className="text-sm text-muted-foreground">
                    {studentAnswerImage ? "Answer image uploaded" : (studentAnswer && studentAnswer.trim()) ? "Answer text entered" : "Upload image or enter text"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={prevSlide} disabled={isAnimating}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={nextSlide} disabled={isAnimating || ((!studentAnswer || !studentAnswer.trim()) && !studentAnswerImage)}>
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSlide === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Step 3: Enter Mark Scheme
                </CardTitle>
                <CardDescription>
                  Upload an image of the mark scheme or paste it manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary: Image Upload */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Upload Mark Scheme</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Take a photo, upload an image, or press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+V</kbd> to paste
                    </p>
                  </div>
                  <ImageUpload
                    onImageUpload={setMarkSchemeImage}
                    onImageRemove={() => setMarkSchemeImage("")}
                    currentImage={markSchemeImage}
                    className="min-h-[200px] border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors"
                  />
                </div>

                {/* Secondary: Text Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Or paste the mark scheme manually</span>
                  </div>
                  <Textarea
                    placeholder="Paste the mark scheme here if you prefer text input..."
                    value={markScheme}
                    onChange={(e) => setMarkScheme(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, 2)}
                    className="min-h-[100px] text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {markSchemeImage ? "Mark scheme image uploaded" : markScheme.trim() ? "Mark scheme text entered" : "Upload image or enter text"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={prevSlide} disabled={isAnimating}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <ProgressButton 
                      onClick={handleEvaluate}
                      disabled={(!question.trim() && !questionImage) || (!studentAnswer.trim() && !studentAnswerImage) || (!markScheme.trim() && !markSchemeImage) || isProcessing}
                      className="bg-primary hover:bg-primary/90"
                      duration={6000}
                      icon={<Sparkles className="w-4 h-4 mr-2" />}
                    >
                      Get Feedback
                    </ProgressButton>
                  </div>
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

              {/* Mark Scheme Viewer */}
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
                      <strong>Max Marks:</strong> {maxMarks || feedbackResult.maxScore}
                    </div>
                    <div className="mt-4">
                      <MarkSchemeDialog 
                        questionNumber="Practice Question" 
                        markScheme={feedbackResult.markScheme || formattedMarkScheme || markScheme} 
                        maxMarks={parseInt(maxMarks) || feedbackResult.maxScore || 10}
                      >
                        <Button 
                          variant="outline" 
                          className="w-full"
                          disabled={formattingMarkScheme}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {formattingMarkScheme ? 'Formatting...' : 'View Mark Scheme'}
                        </Button>
                      </MarkSchemeDialog>
                    </div>
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
                    setStudentAnswerImage("")
                    setMarkSchemeImage("")
                    setFormattedMarkScheme("")
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

export default function Practice() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PracticeContent />
    </Suspense>
  )
}
