"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookOpen, CheckCircle, AlertCircle, XCircle, Eye, EyeOff, Sparkles, ArrowRight, ArrowLeft, FileText, PenTool, Target, Camera, X, Loader2, Save, Brain, Clock } from "lucide-react"
import { ValidationPopup } from "./validation-popup"
import { toast } from "sonner"
import { Navbar } from "./navbar"
import { AuthDialog } from "./auth-dialog"
import { SaveQuestionDialog } from "./save-question-dialog"
import { PricingPopup } from "./pricing-popup"
import { LiveAnswerInput } from "./live-answer-input"
import { AnswerHighlighter } from "./answer-highlighter"
import { ProgressButton } from "./progress-button"
import { useAuth } from "@/contexts/auth-context"
import { ImageUpload } from "./image-upload"
import { PDFUploader } from "./pdf-uploader"
import { saveQuestion, getUser, User } from "@/lib/supabase"

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

export default function MarkSchemeCoach() {
  const { user, session } = useAuth()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [question, setQuestion] = useState("")
  const [markScheme, setMarkScheme] = useState("")
  const [studentAnswer, setStudentAnswer] = useState("")
  const [maxMarks, setMaxMarks] = useState("")
  const [questionImage, setQuestionImage] = useState("")
  const [markSchemeImage, setMarkSchemeImage] = useState("")
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([])
  const [pdfFullText, setPdfFullText] = useState("")
  const [showMarkScheme, setShowMarkScheme] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null)
  const [validationPopup, setValidationPopup] = useState<{message: string, isVisible: boolean}>({message: "", isVisible: false})
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [userData, setUserData] = useState<User | null>(null)
  const [pricingPopupOpen, setPricingPopupOpen] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(false)

  const slideContainerRef = useRef<HTMLDivElement>(null)

  const showValidationMessage = (message: string) => {
    setValidationPopup({ message, isVisible: true })
  }

  const checkAuthAndProceed = (action: () => void) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }
    action()
  }

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadUserData()
    } else {
      setUserData(null)
    }
  }, [user])

  // Reset to first slide when component mounts or when navigating to root
  useEffect(() => {
    setCurrentSlide(0)
    setQuestion("")
    setMarkScheme("")
    setStudentAnswer("")
    setMaxMarks("")
    setQuestionImage("")
    setMarkSchemeImage("")
    setShowMarkScheme(false)
    setShowFeedback(false)
    setIsAnimating(false)
    setIsProcessing(false)
    setFeedbackResult(null)
    setValidationPopup({message: "", isVisible: false})
    setSaveDialogOpen(false)
    setSavingQuestion(false)
    setPricingPopupOpen(false)
    setIsLiveMode(false)
  }, [])

  const loadUserData = async () => {
    if (!user) return
    
    try {
      const data = await getUser(user.id)
      setUserData(data)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
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

  const goToSlide = (slideIndex: number) => {
    if (isAnimating) return
    
    checkAuthAndProceed(() => {
      // Check if user has questions left when trying to go to any slide beyond 0
      if (slideIndex > 0 && userData && userData.questionsLeft <= 0) {
        setPricingPopupOpen(true)
        return
      }
      
      // Prevent going to slide 4 if no feedback results
      if (slideIndex === 3 && !feedbackResult) {
        showValidationMessage("Complete the analysis first to view results")
        return
      }
      
      // Prevent going forward unless current slide is completed
      if (slideIndex > currentSlide) {
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
      }
      
      setIsAnimating(true)
      setCurrentSlide(slideIndex)
      setTimeout(() => setIsAnimating(false), 500)
    })
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

  useEffect(() => {
    if (slideContainerRef.current) {
      slideContainerRef.current.scrollTo({
        left: currentSlide * slideContainerRef.current.offsetWidth,
        behavior: "smooth",
      })
    }
  }, [currentSlide])

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

  const handleQuestionsExtracted = (questions: Array<{
    id: string;
    questionNumber: string;
    text: string;
    marks: number | null;
    type: string;
  }>, fullText: string, metadata?: Record<string, unknown>) => {
    setExtractedQuestions(questions)
    setPdfFullText(fullText)
    // You can add additional logic here to process the extracted questions
    console.log('Extracted questions:', questions)
    console.log('Full PDF text:', fullText)
    console.log('PDF metadata:', metadata)
  }

  const handlePDFError = (error: string) => {
    showValidationMessage(error)
  }

  const handleDiscardQuestion = () => {
    setSaveDialogOpen(false)
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

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <Navbar />
      <ValidationPopup message={validationPopup.message} isVisible={validationPopup.isVisible} onClose={() => setValidationPopup({...validationPopup, isVisible: false})} />
      <AuthDialog isOpen={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
      <SaveQuestionDialog 
        isOpen={saveDialogOpen} 
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveQuestion}
        onDiscard={handleDiscardQuestion}
        isLoading={savingQuestion}
      />
      <PricingPopup 
        isOpen={pricingPopupOpen} 
        onClose={() => setPricingPopupOpen(false)}
        currentTier={userData?.tier || 'free'}
      />

      {user && (
      <div
        ref={slideContainerRef}
        className="flex transition-transform duration-500 ease-in-out min-h-screen"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {/* Slide 1: Question Input */}
        <div className="min-w-full flex items-center justify-center p-8" data-question-container>
          <div className="max-w-2xl w-full space-y-8 animate-in fade-in-50 slide-in-from-bottom-10 duration-700">
            <div className="text-center space-y-4">
              {/* Paper Mode Toggle - Only show when user is logged in */}
              {user && (
                <div className="flex justify-center mb-6">
                  <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-3xl border-2 border-primary/20 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-16 h-8 rounded-full transition-all duration-300 ease-in-out cursor-pointer relative ${
                        isLiveMode ? 'bg-primary' : 'bg-muted'
                      }`} onClick={() => setIsLiveMode(!isLiveMode)}>
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ease-in-out shadow-lg ${
                          isLiveMode ? 'left-9' : 'left-1'
                        }`} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-foreground">
                          {isLiveMode ? 'Question Bank Mode' : 'Individual Question Mode'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isLiveMode ? 'Access your saved questions' : 'Paste individual questions'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLiveMode ? (
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-primary animate-pulse" />
                          <span className="text-xs text-primary font-medium">Question Bank</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">Individual</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="p-4 bg-primary rounded-3xl shadow-xl">
                  <BookOpen className="w-10 h-10 text-primary-foreground" />
                </div>
                <h1 className="text-5xl font-bold text-foreground text-balance">
                  {user ? "Let's Get Started!" : "AI-Powered GCSE Marking"}
                </h1>
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-xl text-muted-foreground text-pretty">
                {user ? (
                  isLiveMode 
                    ? "Access your question bank to practice with saved questions and get detailed feedback"
                    : "Upload an individual exam question and get detailed feedback on your answer"
                ) : (
                  "Know your content but still getting low grades? Master exam technique with AI-powered feedback on your GCSE answers. Perfect for Biology, Chemistry, Physics, and Computer Science."
                )}
              </p>
            </div>

            {/* Question Bank Option - Only show when user is logged in and in full paper mode */}
            {user && isLiveMode && (
              <Card className="rounded-3xl shadow-2xl card-hover border-2 border-primary/20 mb-8">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    Question Bank
                  </CardTitle>
                  <CardDescription className="text-lg">Access your saved questions from the question bank</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                      <BookOpen className="w-12 h-12 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-foreground">
                        Practice with Saved Questions
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Browse and practice with questions from your question bank
                      </p>
                    </div>
                    <Link href="/question-bank">
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Go to Question Bank
                      </Button>
                    </Link>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">or</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual Question Option - Show when not logged in or when in individual question mode */}
            {(!user || !isLiveMode) && (
              <Card className="rounded-3xl shadow-2xl card-hover border-2 border-primary/20">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    {user ? "Individual Question" : "What's your question?"}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {user ? "Paste an individual exam question you're working on" : "Paste the exam question you're working on"}
                  </CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="e.g., Explain the process of photosynthesis and its importance to life on Earth. (10 marks)"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, 0)}
                    className="min-h-[150px] text-lg rounded-2xl border-2 border-blue-100 focus:border-primary transition-all duration-300 focus:shadow-lg"
                    autoFocus
                  />
                  

                </div>
                <div className="mt-4 flex items-center justify-between">
                  {currentSlide > 0 && (
                    <Button
                      onClick={prevSlide}
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg border hover:scale-110 transition-all duration-200 btn-hover-border"
                      disabled={isAnimating}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  )}
                  {currentSlide === 0 && <div></div>}
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> to continue
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ImageUpload
                      onImageUpload={setQuestionImage}
                      onImageRemove={() => setQuestionImage("")}
                      currentImage={questionImage}
                    />
                    {currentSlide < 3 && !showFeedback && (
                      <Button
                        onClick={nextSlide}
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-accent shadow-lg border hover:scale-110 transition-all duration-200 accent-btn-hover"
                        disabled={isAnimating}
                      >
                        <ArrowRight className="w-5 h-5 text-white" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </div>

        {/* Slide 2: Student Answer Input - Only show when not in full paper mode */}
        {!isLiveMode && (
        <div className="min-w-full flex items-center justify-center p-8">
          <div className="max-w-2xl w-full space-y-8 animate-in fade-in-50 slide-in-from-bottom-10 duration-700">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="p-4 bg-accent rounded-3xl shadow-xl">
                  <PenTool className="w-10 h-10 text-accent-foreground" />
                </div>
                <h2 className="text-4xl font-bold text-foreground">Great! Now your answer</h2>
                <Sparkles className="w-8 h-8 text-accent animate-pulse" />
              </div>
              <p className="text-xl text-muted-foreground text-pretty">
                {isLiveMode 
                  ? "Type your answer and see real-time feedback as you write!"
                  : "Write or paste your answer and I'll give you detailed feedback"
                }
              </p>
            </div>

            <Card className="rounded-3xl shadow-2xl card-hover border-2 border-accent/20">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                  {isLiveMode ? "Live Answer" : "Your Answer"}
                </CardTitle>
                <CardDescription className="text-lg">
                  {isLiveMode 
                    ? "Type your answer and get instant feedback as you write"
                    : "Write your best attempt at answering the question"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLiveMode ? (
                  <LiveAnswerInput
                    value={studentAnswer}
                    onChange={setStudentAnswer}
                    markScheme={markScheme}
                    question={question}
                    maxMarks={maxMarks}
                    onMaxMarksChange={setMaxMarks}
                    onKeyDown={(e) => handleKeyPress(e, 1)}
                    autoFocus={currentSlide === 1}
                  />
                ) : (
                  <>
                    <Textarea
                      placeholder="e.g., Photosynthesis is the process where plants make food using sunlight and water to produce glucose and oxygen..."
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, 1)}
                      className="min-h-[180px] text-lg rounded-2xl border-2 border-blue-100 focus:border-accent transition-all duration-300 focus:shadow-lg"
                      autoFocus={currentSlide === 1}
                    />
                    <div className="flex items-center justify-center gap-4">
                      <Label htmlFor="maxMarks" className="text-lg font-medium">
                        Max Marks (optional):
                      </Label>
                      <Input
                        id="maxMarks"
                        type="number"
                        placeholder="10"
                        value={maxMarks}
                        onChange={(e) => setMaxMarks(e.target.value)}
                        className="w-24 text-lg rounded-xl border-2 border-blue-100 focus:border-accent"
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <div className="mt-4 flex items-center justify-between px-6 pb-6">
                <Button
                  onClick={prevSlide}
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg border hover:scale-110 transition-all duration-200 btn-hover-border"
                  disabled={isAnimating}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> to continue
                  </p>
                </div>
                {currentSlide < 3 && !showFeedback && (
                  <Button
                    onClick={nextSlide}
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-accent shadow-lg border hover:scale-110 transition-all duration-200 accent-btn-hover"
                    disabled={isAnimating}
                  >
                    <ArrowRight className="w-5 h-5 text-white" />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
        )}

        {/* Slide 3: Mark Scheme Input - Only show when not in full paper mode */}
        {!isLiveMode && (
        <div className="min-w-full flex items-center justify-center p-8">
          <div className="max-w-2xl w-full space-y-8 animate-in fade-in-50 slide-in-from-bottom-10 duration-700">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="p-4 bg-secondary rounded-3xl shadow-xl">
                  <FileText className="w-10 h-10 text-secondary-foreground" />
                </div>
                <h2 className="text-4xl font-bold text-foreground">Perfect! Now the mark scheme</h2>
                <Sparkles className="w-8 h-8 text-secondary animate-pulse" />
              </div>
              <p className="text-xl text-muted-foreground text-pretty">
                This helps me understand what examiners are looking for
              </p>
            </div>

            <Card className="rounded-3xl shadow-2xl card-hover border-2 border-secondary/20">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-secondary rounded-full animate-pulse"></div>
                  Mark Scheme
                </CardTitle>
                <CardDescription className="text-lg">
                  Paste the official mark scheme or marking criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="e.g., Level 3 (7-10 marks): Detailed explanation including reactants, products, and energy conversion..."
                    value={markScheme}
                    onChange={(e) => setMarkScheme(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, 2)}
                    className="min-h-[180px] text-lg rounded-2xl border-2 border-blue-100 focus:border-secondary transition-all duration-300 focus:shadow-lg"
                    autoFocus={currentSlide === 2}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    onClick={prevSlide}
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg border hover:scale-110 transition-all duration-200 btn-hover-border"
                    disabled={isAnimating}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-4">
                    <ImageUpload
                      onImageUpload={setMarkSchemeImage}
                      onImageRemove={() => setMarkSchemeImage("")}
                      currentImage={markSchemeImage}
                    />
                    <p className="text-sm text-muted-foreground">
                      Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> to continue
                    </p>
                  </div>
                  {currentSlide < 3 && !showFeedback && (
                    <Button
                      onClick={nextSlide}
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 rounded-full bg-accent shadow-lg border hover:scale-110 transition-all duration-200 accent-btn-hover"
                      disabled={isAnimating}
                    >
                      <ArrowRight className="w-5 h-5 text-white" />
                    </Button>
                  )}
                </div>
                <div className="text-center space-y-4">
                  <ProgressButton
                    onClick={handleEvaluate}
                    className="btn-3d rounded-2xl px-12 py-6 text-xl font-bold bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-200 shadow-2xl"
                    disabled={!question || !studentAnswer || !markScheme || isProcessing}
                    duration={6000}
                    icon={<Sparkles className="w-6 h-6 mr-3" />}
                  >
                    Get My Feedback!
                  </ProgressButton>
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={prevSlide}
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg border hover:scale-110 transition-all duration-200 btn-hover-border"
                      disabled={isAnimating}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Or press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> in the text area
                    </p>
                    <div className="w-10 h-10"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Slide 4: Feedback Results */}
        <div className="min-w-full flex items-start justify-center p-8 pt-20">
          <div className="max-w-6xl w-full space-y-8 animate-in fade-in-50 slide-in-from-bottom-10 duration-700">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="p-4 bg-primary rounded-3xl shadow-xl">
                  <Target className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-4xl font-bold text-foreground">Your Results Are In! 🎉</h2>
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-xl text-muted-foreground text-pretty">Here's your detailed feedback and score</p>
            </div>

            {showFeedback && feedbackResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Card - Left Column */}
                <div className="lg:col-span-1">
                  <Card className="rounded-3xl shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-3xl mb-6">Your Score</CardTitle>
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-6xl font-bold text-primary">{feedbackResult.score}</div>
                        <div className="text-4xl text-muted-foreground">/ {feedbackResult.maxScore}</div>
                      </div>
                      <Badge variant="secondary" className="text-2xl px-6 py-3 rounded-2xl mt-4">
                        {Math.round((feedbackResult.score / feedbackResult.maxScore) * 100)}%
                      </Badge>
                    </CardHeader>
                  </Card>

                  {/* Save Question Button */}
                  <div className="mt-6">
                    <Button
                      onClick={() => setSaveDialogOpen(true)}
                      size="lg"
                      className="w-full bg-accent text-white hover:bg-accent/90 rounded-2xl text-lg px-8 py-4"
                    >
                      <Save className="w-5 h-5 mr-3" />
                      Save Question
                    </Button>
                  </div>

                  {/* Mark Scheme Button */}
                  <div className="mt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full btn-3d rounded-2xl text-lg px-8 py-4"
                          onClick={() => setShowMarkScheme(!showMarkScheme)}
                        >
                          {showMarkScheme ? <EyeOff className="w-5 h-5 mr-3" /> : <Eye className="w-5 h-5 mr-3" />}
                          {showMarkScheme ? "Hide" : "View"} Mark Scheme
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] rounded-3xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl">Official Mark Scheme</DialogTitle>
                          <DialogDescription className="text-lg">
                            Compare your answer against the official marking criteria
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh] w-full">
                          <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/30 p-6 rounded-2xl leading-relaxed">
                            {feedbackResult.markScheme}
                          </pre>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Try Another Button */}
                  <div className="mt-4">
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
                      variant="outline"
                      size="lg"
                      className="w-full rounded-2xl px-8 py-4 text-lg"
                    >
                      Try Another Question
                    </Button>
                  </div>
                </div>

                {/* Feedback Content - Right Column */}
                <div className="lg:col-span-2">
                  <Card className="rounded-3xl shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-secondary" />
                        Your Answer with Feedback
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Hover over highlighted sections for improvement suggestions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-xl leading-relaxed max-h-[400px] overflow-y-auto">
                            <AnswerHighlighter 
                              answerText={studentAnswer}
                              highlights={feedbackResult.highlights || []}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-green-100 rounded-lg"></div>
                          <span className="text-lg">Correct</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-yellow-100 rounded-lg"></div>
                          <span className="text-lg">Could improve</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-red-100 rounded-lg"></div>
                          <span className="text-lg">Missing/Incorrect</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Strengths and Improvements */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    {/* Strengths */}
                    {feedbackResult.analysis && feedbackResult.analysis.strengths && feedbackResult.analysis.strengths.length > 0 && (
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
                    {feedbackResult.analysis && feedbackResult.analysis.improvements && feedbackResult.analysis.improvements.length > 0 && (
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
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Loading State - Left Column */}
                <div className="lg:col-span-1">
                  <Card className="rounded-3xl shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-3xl mb-6">Your Score</CardTitle>
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-6xl font-bold text-muted-foreground">--</div>
                        <div className="text-4xl text-muted-foreground">/ --</div>
                      </div>
                      <Badge variant="secondary" className="text-2xl px-6 py-3 rounded-2xl mt-4">
                        --%
                      </Badge>
                    </CardHeader>
                  </Card>

                  {/* Placeholder Buttons */}
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full btn-3d rounded-2xl text-lg px-8 py-4"
                      disabled
                    >
                      <Eye className="w-5 h-5 mr-3" />
                      View Mark Scheme
                    </Button>
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={() => setCurrentSlide(0)}
                      variant="outline"
                      size="lg"
                      className="w-full rounded-2xl px-8 py-4 text-lg"
                    >
                      Back to Start
                    </Button>
                  </div>
                </div>

                {/* Loading State - Right Column */}
                <div className="lg:col-span-2">
                  <Card className="rounded-3xl shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-secondary" />
                        Your Answer with Feedback
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Complete the analysis to see your feedback
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-xl leading-relaxed max-h-[400px] flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                              <p>Complete the analysis to see your detailed feedback</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-green-100 rounded-lg"></div>
                          <span className="text-lg">Correct</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-yellow-100 rounded-lg"></div>
                          <span className="text-lg">Could improve</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-red-100 rounded-lg"></div>
                          <span className="text-lg">Missing/Incorrect</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Landing Page - Only show for non-logged-in users */}
      {!user && (
        <div className="w-full">
          {/* HERO SECTION */}
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
            
            <div className="container mx-auto px-4 py-20 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Left Side - Text Content */}
                <div className="space-y-10">
                  <div className="space-y-6">
                    <h1 className="text-6xl lg:text-7xl font-bold leading-[0.9] tracking-tight">
                      <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Stop Losing Marks on
                      </span>
                      <br />
                      <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                        Exam Technique
                      </span>
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                      Know your content but still getting low grades? Our AI-powered marking system teaches you exactly what GCSE examiners want to see in your answers.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-10 py-5 text-lg font-semibold rounded-2xl shadow-2xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105"
                      onClick={() => {
                        const authButton = document.querySelector('[data-auth-button]');
                        if (authButton) {
                          (authButton as HTMLElement).click();
                        }
                      }}
                    >
                      Start Improving Now - Free
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="px-10 py-5 text-lg font-semibold rounded-2xl border-2 hover:bg-background/50 transition-all duration-300"
                      onClick={() => {
                        const demoSection = document.querySelector('[data-demo-section]');
                        if (demoSection) {
                          demoSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      Watch Demo
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-8 text-sm">
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-700 dark:text-green-300 font-medium">Free to start</span>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-full">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-700 dark:text-blue-300 font-medium">No credit card</span>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950 px-3 py-2 rounded-full">
                      <CheckCircle className="w-4 h-4 text-purple-500" />
                      <span className="text-purple-700 dark:text-purple-300 font-medium">Instant feedback</span>
                    </div>
                  </div>
                </div>
                
                {/* Right Side - VSL/Demo Space */}
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-3xl border border-primary/20 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-4xl">🎥</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Demo Video Coming Soon</h3>
                        <p className="text-muted-foreground text-lg">See how our AI marking system works in action</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE GRID SECTION */}
          <div className="py-24 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden" data-demo-section>
            {/* Background Elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-20">
                <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Why Students Choose Our AI Marking System
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Transform your knowledge into exam success with targeted technique feedback
                </p>
              </div>
              
              {/* Feature Grid - Different sized tiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Large Feature Tile */}
                <Card className="lg:col-span-2 lg:row-span-2 p-10 border border-primary/10 bg-gradient-to-br from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all duration-500 group backdrop-blur-sm">
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-all duration-300">
                        <Brain className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Examiner-Level AI Analysis</h3>
                      <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                        Our AI understands exactly what GCSE examiners are looking for. Get feedback that matches real marking criteria, not generic responses.
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
                      <p className="text-base font-medium text-primary italic">"Finally, feedback that actually helps me improve my exam technique!"</p>
                    </div>
                  </div>
                </Card>
                
                {/* Medium Feature Tiles */}
                <Card className="p-8 border border-primary/10 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 hover:from-green-100/70 hover:to-green-200/50 dark:hover:from-green-950/40 dark:hover:to-green-900/20 transition-all duration-500 group backdrop-blur-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Instant Feedback</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Get detailed marking results in seconds, not weeks. Practice more, improve faster.
                  </p>
                </Card>
                
                <Card className="p-8 border border-primary/10 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 hover:from-blue-100/70 hover:to-blue-200/50 dark:hover:from-blue-950/40 dark:hover:to-blue-900/20 transition-all duration-500 group backdrop-blur-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">GCSE-Specific</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Designed specifically for Biology, Chemistry, Physics, and Computer Science GCSEs.
                  </p>
                </Card>
                
                <Card className="p-8 border border-primary/10 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 hover:from-purple-100/70 hover:to-purple-200/50 dark:hover:from-purple-950/40 dark:hover:to-purple-900/20 transition-all duration-500 group backdrop-blur-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Progress Tracking</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    See your improvement over time with detailed analytics and performance insights.
                  </p>
                </Card>
                
                <Card className="p-8 border border-primary/10 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10 hover:from-orange-100/70 hover:to-orange-200/50 dark:hover:from-orange-950/40 dark:hover:to-orange-900/20 transition-all duration-500 group backdrop-blur-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400/20 to-orange-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Technique Focus</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Learn how to structure answers, use key terms, and present your knowledge effectively.
                  </p>
                </Card>
              </div>
            </div>
          </div>

          {/* TESTIMONIALS SECTION */}
          <div className="py-24 bg-gradient-to-b from-muted/20 to-background relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-1/4 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-20">
                <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  What Students Are Saying
                </h2>
                <p className="text-xl text-muted-foreground">Real feedback from real students</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="p-8 border border-primary/10 bg-gradient-to-br from-background/80 to-muted/20 hover:from-background/90 hover:to-muted/30 transition-all duration-500 group backdrop-blur-sm">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">⭐</span>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                    "I went from getting 4s to 7s in Biology. The AI feedback showed me exactly what I was missing in my answers."
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">S</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg">Sarah M.</p>
                      <p className="text-sm text-muted-foreground">Year 11 Student</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-8 border border-primary/10 bg-gradient-to-br from-background/80 to-muted/20 hover:from-background/90 hover:to-muted/30 transition-all duration-500 group backdrop-blur-sm">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">⭐</span>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                    "Finally understand what examiners want! My Chemistry grades improved dramatically after using this."
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">J</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg">James L.</p>
                      <p className="text-sm text-muted-foreground">Year 11 Student</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-8 border border-primary/10 bg-gradient-to-br from-background/80 to-muted/20 hover:from-background/90 hover:to-muted/30 transition-all duration-500 group backdrop-blur-sm">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">⭐</span>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                    "The instant feedback is amazing. I can practice as much as I want and see my technique improve in real-time."
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">E</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg">Emma K.</p>
                      <p className="text-sm text-muted-foreground">Year 11 Student</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* PRICING SECTION */}
          <div className="py-24 bg-gradient-to-b from-background to-muted/10 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-20">
                <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Simple, Transparent Pricing
                </h2>
                <p className="text-xl text-muted-foreground">No hidden fees, no surprises</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <Card className="p-10 border border-primary/10 bg-gradient-to-br from-background/80 to-muted/20 hover:from-background/90 hover:to-muted/30 transition-all duration-500 group backdrop-blur-sm">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold mb-4">Free</h3>
                    <div className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">£0</div>
                    <p className="text-muted-foreground mb-8 text-lg">Perfect for trying out the system</p>
                    <ul className="space-y-4 mb-10 text-left">
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">5 questions per day</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Basic AI feedback</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">All subjects supported</span>
                      </li>
                    </ul>
                    <Button className="w-full py-4 text-lg font-semibold rounded-2xl border-2 hover:bg-background/50 transition-all duration-300" variant="outline">
                      Get Started Free
                    </Button>
                  </div>
                </Card>
                
                <Card className="p-10 border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5 relative group backdrop-blur-sm">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-3xl font-bold mb-4">Pro</h3>
                    <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">£9.99</div>
                    <div className="text-lg text-muted-foreground mb-6">/month</div>
                    <p className="text-muted-foreground mb-8 text-lg">For serious students</p>
                    <ul className="space-y-4 mb-10 text-left">
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Unlimited questions</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Advanced AI feedback</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Question bank access</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Progress tracking</span>
                      </li>
                    </ul>
                    <Button className="w-full py-4 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-2xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105">
                      Start Pro Trial
                    </Button>
                  </div>
                </Card>
                
                <Card className="p-10 border border-primary/10 bg-gradient-to-br from-background/80 to-muted/20 hover:from-background/90 hover:to-muted/30 transition-all duration-500 group backdrop-blur-sm">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold mb-4">Premium</h3>
                    <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">£19.99</div>
                    <div className="text-lg text-muted-foreground mb-6">/month</div>
                    <p className="text-muted-foreground mb-8 text-lg">For exam success</p>
                    <ul className="space-y-4 mb-10 text-left">
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Everything in Pro</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Live mode feedback</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Priority support</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-lg">Advanced analytics</span>
                      </li>
                    </ul>
                    <Button className="w-full py-4 text-lg font-semibold rounded-2xl border-2 hover:bg-background/50 transition-all duration-300" variant="outline">
                      Go Premium
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* FAQ SECTION */}
          <div className="py-20 bg-gradient-to-b from-muted/20 to-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                <p className="text-xl text-muted-foreground">Everything you need to know</p>
              </div>
              
              <div className="max-w-3xl mx-auto space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-3">How accurate is the AI marking?</h3>
                  <p className="text-muted-foreground">
                    Our AI is trained on thousands of real GCSE exam papers and marking schemes. It provides feedback that closely matches what real examiners look for, helping you understand exactly how to improve your answers.
                  </p>
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-3">Which subjects are supported?</h3>
                  <p className="text-muted-foreground">
                    We currently support Biology, Chemistry, Physics, and Computer Science GCSEs. All questions must be text-based - we don't support image-based questions or diagrams.
                  </p>
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-3">Is there a free trial?</h3>
                  <p className="text-muted-foreground">
                    Yes! You can start with our free plan that includes 5 questions per day. No credit card required. Upgrade anytime to unlock unlimited questions and advanced features.
                  </p>
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-3">How quickly do I get feedback?</h3>
                  <p className="text-muted-foreground">
                    Feedback is instant! As soon as you submit your answer, our AI analyzes it and provides detailed feedback within seconds. No waiting for teachers to mark your work.
                  </p>
                </Card>
              </div>
            </div>
          </div>

          {/* FINAL CTA SECTION */}
          <div className="py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
            <div className="absolute top-10 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
            
            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Ready to Transform Your
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  GCSE Grades?
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                Join thousands of students who've improved their exam technique with our AI marking system. Start free today.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-16 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105"
                  onClick={() => {
                    const authButton = document.querySelector('[data-auth-button]');
                    if (authButton) {
                      (authButton as HTMLElement).click();
                    }
                  }}
                >
                  Start Improving Now - Free
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="px-16 py-6 text-xl font-semibold rounded-2xl border-2 hover:bg-background/50 transition-all duration-300"
                >
                  Learn More
                </Button>
              </div>
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 px-4 py-2 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-700 dark:text-green-300 font-medium">No credit card required</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded-full">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950 px-4 py-2 rounded-full">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                  <span className="text-purple-700 dark:text-purple-300 font-medium">5 questions free daily</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
