"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, CheckCircle, Loader2, ArrowRight, ArrowLeft, Save, X } from "lucide-react"
import { PDFUploader } from "@/components/pdf-uploader"
import { PricingPopup } from "@/components/pricing-popup"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getUser, User } from "@/lib/supabase"

interface ExtractedQuestion {
  id: string
  text: string
  questionNumber?: string
  marks?: string
  type: 'text' | 'multiple-choice' | 'essay' | 'short-answer'
  markScheme?: string
  maxMarks?: number
  subject?: string
  topic?: string
  level?: string
  difficulty?: string
}

interface PDFMetadata {
  pages: number
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
}

interface ExamUploadFlowProps {
  onQuestionsExtracted?: (questions: ExtractedQuestion[], fullText: string, metadata: PDFMetadata) => void
  onError?: (error: string) => void
}

type UploadStep = 'upload' | 'mark-scheme' | 'processing' | 'preview' | 'complete'

export function ExamUploadFlow({ onQuestionsExtracted, onError }: ExamUploadFlowProps) {
  const { user, session } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [showPricing, setShowPricing] = useState(false)
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [markSchemeFile, setMarkSchemeFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([])
  const [pdfMetadata, setPdfMetadata] = useState<PDFMetadata | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [savedPaperId, setSavedPaperId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  // Debug state changes
  useEffect(() => {
    console.log('State updated:', { 
      extractedText: !!extractedText, 
      extractedTextLength: extractedText?.length || 0,
      markSchemeFile: !!markSchemeFile,
      currentStep
    })
  }, [extractedText, markSchemeFile, currentStep])

  const loadUserData = async () => {
    if (!user) return
    
    try {
      const data = await getUser(user.id)
      setUserData(data)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const isUserProPlus = userData?.tier === 'pro+'

  const handleUpgradeClick = () => {
    setShowPricing(true)
  }

  const handleExamPaperUpload = (questions: ExtractedQuestion[], fullText: string, metadata?: PDFMetadata) => {
    console.log('Exam paper uploaded:', { questionsCount: questions.length, textLength: fullText.length })
    setExtractedQuestions(questions)
    setExtractedText(fullText)
    setPdfMetadata(metadata || null)
    
    // Save the paper to get a paper ID (async operation)
    savePaperAsync(metadata || null, fullText)
    
    setCurrentStep('mark-scheme')
  }

  const savePaperAsync = async (metadata: PDFMetadata | null, fullText: string) => {
    try {
      const response = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: metadata?.title || 'Exam Paper',
          filename: 'exam-paper.pdf',
          fileSize: 0,
          subject: determineSubjectFromText(fullText),
          level: 'mixed',
          examBoard: null,
          year: null,
          extractedText: fullText
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSavedPaperId(data.data.id)
        console.log('Paper saved with ID:', data.data.id)
      }
    } catch (error) {
      console.error('Error saving paper:', error)
    }
  }

  const handleMarkSchemeUpload = (file: File) => {
    console.log('Mark scheme file uploaded:', file.name)
    setMarkSchemeFile(file)
    setCurrentStep('processing')
    
    // Process immediately with the file parameter
    processExamPaperWithFile(file)
  }

  const processExamPaperWithFile = async (markSchemeFile: File) => {
    console.log('Processing exam paper with mark scheme file:', markSchemeFile.name)
    
    if (!extractedText) {
      console.error('Missing extractedText from exam paper')
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      console.log('Starting exam paper processing...')
      
      // Step 1: Extract mark scheme text using the same method as question paper
      setProcessingProgress(20)
      console.log('Processing mark scheme PDF...')
      const markSchemeFormData = new FormData()
      markSchemeFormData.append('file', markSchemeFile)
      
      const markSchemeResponse = await fetch('/api/process-pdf', {
        method: 'POST',
        body: markSchemeFormData,
      })

      if (!markSchemeResponse.ok) {
        const errorText = await markSchemeResponse.text()
        console.error('Mark scheme processing failed:', errorText)
        throw new Error(`Failed to process mark scheme: ${markSchemeResponse.status}`)
      }

      const markSchemeData = await markSchemeResponse.json()
      console.log('Mark scheme processed successfully')
      const markSchemeText = markSchemeData.data.fullText

      setProcessingProgress(40)

      // Step 2: Extract questions from exam paper
      console.log('Extracting questions from exam paper...')
      const questionsResponse = await fetch('/api/extract-pdf-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfText: extractedText
        })
      })

      if (!questionsResponse.ok) {
        const errorText = await questionsResponse.text()
        console.error('Question extraction failed:', errorText)
        throw new Error(`Failed to extract questions: ${questionsResponse.status}`)
      }

      const questionsData = await questionsResponse.json()
      console.log('Questions extracted:', questionsData.data.questions.length)
      setProcessingProgress(60)

      // Step 3: Use AI to extract questions from mark scheme with the same approach
      console.log('Using AI to extract questions from mark scheme...')
      const markSchemeQuestionsResponse = await fetch('/api/extract-mark-scheme-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markSchemeText: markSchemeText
        })
      })

      if (!markSchemeQuestionsResponse.ok) {
        const errorText = await markSchemeQuestionsResponse.text()
        console.error('Mark scheme question extraction failed:', errorText)
        throw new Error(`Failed to extract mark scheme questions: ${markSchemeQuestionsResponse.status}`)
      }

      const markSchemeQuestionsData = await markSchemeQuestionsResponse.json()
      console.log('Mark scheme questions extracted:', markSchemeQuestionsData.data.questions.length)
      setProcessingProgress(70)

      // Step 4: Match exam questions with mark scheme questions
      const processedQuestions = []
      for (const examQuestion of questionsData.data.questions) {
        const questionNumber = examQuestion.questionNumber || ''
        const matchingMarkScheme = markSchemeQuestionsData.data.questions.find((ms: any) => 
          ms.questionNumber === questionNumber || 
          ms.questionNumber === questionNumber.replace(/[^\d]/g, '')
        )
        
        if (matchingMarkScheme) {
          processedQuestions.push({
            id: examQuestion.id,
            questionNumber: examQuestion.questionNumber || '',
            text: examQuestion.text,
            marks: examQuestion.marks || '1',
            type: examQuestion.type || 'text',
            markScheme: matchingMarkScheme.markScheme,
            maxMarks: matchingMarkScheme.maxMarks,
            subject: determineSubjectFromText(examQuestion.text),
            topic: 'General',
            level: 'mixed',
            difficulty: 'medium'
          })
        }
      }

      console.log('Processed questions:', processedQuestions.length)
      setProcessingProgress(90)
      setExtractedQuestions(processedQuestions)
      setCurrentStep('preview')
      setProcessingProgress(100)

    } catch (error) {
      console.error('Error processing exam paper:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to process exam paper')
      setCurrentStep('mark-scheme') // Go back to mark scheme step on error
    } finally {
      setIsProcessing(false)
    }
  }


  const determineSubjectFromText = (text: string): string => {
    const textLower = text.toLowerCase()
    
    if (textLower.includes('photosynthesis') || textLower.includes('cell') || textLower.includes('dna') || textLower.includes('biology')) {
      return 'biology'
    }
    if (textLower.includes('molecule') || textLower.includes('reaction') || textLower.includes('element') || textLower.includes('chemistry')) {
      return 'chemistry'
    }
    if (textLower.includes('force') || textLower.includes('energy') || textLower.includes('wave') || textLower.includes('physics')) {
      return 'physics'
    }
    if (textLower.includes('algorithm') || textLower.includes('programming') || textLower.includes('code') || textLower.includes('computer')) {
      return 'computer-science'
    }
    if (textLower.includes('equation') || textLower.includes('calculate') || textLower.includes('solve') || textLower.includes('math')) {
      return 'mathematics'
    }
    if (textLower.includes('essay') || textLower.includes('literature') || textLower.includes('poem') || textLower.includes('english')) {
      return 'english'
    }
    if (textLower.includes('war') || textLower.includes('revolution') || textLower.includes('ancient') || textLower.includes('history')) {
      return 'history'
    }
    if (textLower.includes('climate') || textLower.includes('population') || textLower.includes('ecosystem') || textLower.includes('geography')) {
      return 'geography'
    }
    
    return 'other'
  }

  const handleSaveQuestions = async () => {
    try {
      // Save each question to the question bank
      for (const question of extractedQuestions) {
        const response = await fetch('/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: question.text,
            subject: question.subject,
            topic: question.topic,
            level: question.level,
            marks: question.maxMarks,
            mark_scheme: question.markScheme,
            question_type: question.type,
            difficulty: question.difficulty,
            paper_id: savedPaperId,
            is_from_paper: true
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to save question ${question.questionNumber}`)
        }
      }

      setCurrentStep('complete')
      onQuestionsExtracted?.(extractedQuestions, extractedText, pdfMetadata!)
    } catch (error) {
      console.error('Error saving questions:', error)
      onError?.('Failed to save questions to question bank')
    }
  }

  const handleDiscardQuestions = () => {
    setCurrentStep('upload')
    setUploadedFile(null)
    setMarkSchemeFile(null)
    setExtractedText("")
    setExtractedQuestions([])
    setPdfMetadata(null)
    setSavedPaperId(null)
  }

  // Always show blurred version with "coming soon" for everyone
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="relative overflow-hidden group cursor-not-allowed">
            {/* Blurred overlay with hover tooltip */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center opacity-100 group-hover:opacity-95 transition-opacity">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Exam Paper Upload</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload full exam papers and extract questions automatically
                  </p>
                  <Button onClick={handleUpgradeClick} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Upgrade to Pro+
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Actual exam uploader content (blurred) */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Exam Paper Upload
              </CardTitle>
              <CardDescription>
                Upload full exam papers and extract questions automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="pointer-events-none">
              <PDFUploader 
                onQuestionsExtracted={() => {}} // Disabled - coming soon
                onError={() => {}}
              />
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>Coming Soon - This feature will be available soon!</p>
        </TooltipContent>
      </Tooltip>

      <PricingPopup 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
        currentTier={userData?.tier || 'free'} 
      />
    </>
  )
}
