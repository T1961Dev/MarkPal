"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ExtractedQuestion, PDFMetadata } from "@/types/exam-types"
import { supabase } from "@/lib/supabase"

interface PDFUploaderProps {
  onQuestionsExtracted: (questions: ExtractedQuestion[], fullText: string, metadata?: PDFMetadata) => void
  onError: (error: string) => void
  onPaperSaved?: (paperId: string) => void
  showSaveOption?: boolean
}

export function PDFUploader({ onQuestionsExtracted, onError, onPaperSaved, showSaveOption = false }: PDFUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([])
  const [pdfMetadata, setPdfMetadata] = useState<PDFMetadata | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [paperSaved, setPaperSaved] = useState(false)
  const [savedPaperId, setSavedPaperId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      onError('Please select a PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      onError('File size must be less than 10MB')
      return
    }

    setUploadedFile(file)
    setIsUploading(true)
    
    try {
      await processPDF(file)
    } catch (error) {
      console.error('Error processing PDF:', error)
      onError('Failed to process PDF. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const processPDF = async (file: File) => {
    setIsProcessing(true)
    
    try {
      // Create FormData to send the file to the server for FULL text extraction
      const formData = new FormData()
      formData.append('file', file)
      if (savedPaperId) {
        formData.append('paperId', savedPaperId)
      }
      
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      // Send PDF to server for FULL text extraction using pdf-parse
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        headers: {
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: formData,
      })
      
      if (!response.ok) {
        let errorMessage = 'Failed to process PDF'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If response is not JSON (e.g., HTML error page), use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to extract questions from PDF')
      }
      
      const { questions, fullText, pdfMetadata } = result.data
      setExtractedText(fullText)
      setExtractedQuestions(questions)
      setPdfMetadata(pdfMetadata)
      
      // Pass results to parent component
      onQuestionsExtracted(questions, fullText, pdfMetadata)
      
    } catch (error) {
      console.error('PDF processing error:', error)
      onError(error instanceof Error ? error.message : 'Failed to process PDF. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const savePaper = async () => {
    if (!uploadedFile || !extractedText || !pdfMetadata) {
      onError('No paper data to save')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: pdfMetadata.title || uploadedFile.name.replace('.pdf', ''),
          filename: uploadedFile.name,
          fileSize: uploadedFile.size,
          subject: pdfMetadata.subject || 'other',
          level: 'mixed', // Default level, could be determined from content
          examBoard: null,
          year: null,
          extractedText: extractedText
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setPaperSaved(true)
        setSavedPaperId(data.data.id)
        onPaperSaved?.(data.data.id)
      } else {
        onError(data.error || 'Failed to save paper')
      }
    } catch (error) {
      console.error('Error saving paper:', error)
      onError('Failed to save paper. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const extractQuestionsFromText = (text: string): ExtractedQuestion[] => {
    const questions: ExtractedQuestion[] = []
    
    // Split text into lines for processing
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    let currentQuestion: Partial<ExtractedQuestion> | null = null
    let questionText = ''
    let questionCounter = 1
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Look for question patterns
      const questionPatterns = [
        /^(\d+)[\.\)]\s*(.+)/, // "1. Question text" or "1) Question text"
        /^Question\s*(\d+)[:\.\)]\s*(.+)/i, // "Question 1: Question text"
        /^Q(\d+)[:\.\)]\s*(.+)/i, // "Q1: Question text"
        /^(\d+)\s*[\.\)]\s*(.+)/, // "1. Question text" (more flexible)
      ]
      
      // Check if this line looks like a question
      let isQuestion = false
      let questionNumber = ''
      let questionContent = ''
      
      for (const pattern of questionPatterns) {
        const match = line.match(pattern)
        if (match) {
          isQuestion = true
          questionNumber = match[1]
          questionContent = match[2]
          break
        }
      }
      
      // Also check for lines that end with question marks and contain question keywords
      const questionKeywords = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'explain', 'describe', 'compare', 'contrast', 'analyze', 'evaluate', 'discuss']
      const hasQuestionMark = line.includes('?')
      const hasQuestionKeyword = questionKeywords.some(keyword => 
        line.toLowerCase().includes(keyword)
      )
      
      if (hasQuestionMark && hasQuestionKeyword && line.length > 20) {
        isQuestion = true
        questionNumber = questionCounter.toString()
        questionContent = line
        questionCounter++
      }
      
      if (isQuestion) {
        // Save previous question if exists
        if (currentQuestion && questionText.trim()) {
          questions.push({
            id: `question-${questions.length + 1}`,
            text: questionText.trim(),
            questionNumber: currentQuestion.questionNumber,
            marks: currentQuestion.marks,
            type: determineQuestionType(questionText)
          })
        }
        
        // Start new question
        currentQuestion = {
          questionNumber: questionNumber
        }
        questionText = questionContent
        
        // Look for marks in the same line or next few lines
        const marksMatch = line.match(/\((\d+)\s*marks?\)/i)
        if (marksMatch) {
          currentQuestion.marks = marksMatch[1]
        }
        
      } else if (currentQuestion) {
        // Continue building current question
        questionText += ' ' + line
        
        // Check if we've hit another question or end of section
        const nextLineIsQuestion = i + 1 < lines.length && 
          (questionPatterns.some(pattern => pattern.test(lines[i + 1])) ||
           (lines[i + 1].includes('?') && questionKeywords.some(keyword => 
             lines[i + 1].toLowerCase().includes(keyword))))
        
        if (nextLineIsQuestion || i === lines.length - 1) {
          // Finish current question
          questions.push({
            id: `question-${questions.length + 1}`,
            text: questionText.trim(),
            questionNumber: currentQuestion.questionNumber,
            marks: currentQuestion.marks,
            type: determineQuestionType(questionText)
          })
          
          currentQuestion = null
          questionText = ''
        }
      }
    }
    
    // Add the last question if it exists
    if (currentQuestion && questionText.trim()) {
      questions.push({
        id: `question-${questions.length + 1}`,
        text: questionText.trim(),
        questionNumber: currentQuestion.questionNumber,
        marks: currentQuestion.marks,
        type: determineQuestionType(questionText)
      })
    }
    
    return questions
  }

  const determineQuestionType = (text: string): ExtractedQuestion['type'] => {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('choose') || lowerText.includes('select') || lowerText.includes('circle') || lowerText.includes('tick')) {
      return 'multiple-choice'
    } else if (lowerText.includes('explain') || lowerText.includes('describe') || lowerText.includes('discuss') || lowerText.includes('analyze') || lowerText.includes('evaluate')) {
      return 'essay'
    } else if (lowerText.includes('what') || lowerText.includes('how') || lowerText.includes('why') || lowerText.includes('when') || lowerText.includes('where')) {
      return 'short-answer'
    } else {
      return 'text'
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setExtractedText("")
    setExtractedQuestions([])
    setPdfMetadata(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf') {
        setUploadedFile(file)
        setIsUploading(true)
        processPDF(file).finally(() => setIsUploading(false))
      } else {
        onError('Please select a PDF file')
      }
    }
  }

  const getQuestionTypeColor = (type: ExtractedQuestion['type']) => {
    switch (type) {
      case 'multiple-choice':
        return 'bg-blue-100 text-blue-800'
      case 'essay':
        return 'bg-purple-100 text-purple-800'
      case 'short-answer':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl">
            {isUploading || isProcessing ? (
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            ) : (
              <FileText className="w-12 h-12 text-primary" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-foreground">
              {isUploading || isProcessing ? 'Processing PDF...' : 'Upload Exam Paper'}
            </p>
            <p className="text-sm text-muted-foreground">
              PDF files up to 10MB supported
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              AI-powered question extraction
            </p>
          </div>
          
          {!isUploading && !isProcessing && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-xl">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          )}
        </div>
      </div>

      {/* Uploaded File Info */}
      {uploadedFile && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle className="text-lg">{uploadedFile.name}</CardTitle>
                  <CardDescription>
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    {pdfMetadata && ` • ${pdfMetadata.pages} pages`}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          {/* PDF Metadata */}
          {pdfMetadata && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {pdfMetadata.title && (
                  <div>
                    <span className="font-medium text-muted-foreground">Title:</span>
                    <p className="text-foreground">{pdfMetadata.title}</p>
                  </div>
                )}
                {pdfMetadata.author && (
                  <div>
                    <span className="font-medium text-muted-foreground">Author:</span>
                    <p className="text-foreground">{pdfMetadata.author}</p>
                  </div>
                )}
                {pdfMetadata.subject && (
                  <div>
                    <span className="font-medium text-muted-foreground">Subject:</span>
                    <p className="text-foreground">{pdfMetadata.subject}</p>
                  </div>
                )}
                {pdfMetadata.creator && (
                  <div>
                    <span className="font-medium text-muted-foreground">Creator:</span>
                    <p className="text-foreground">{pdfMetadata.creator}</p>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Extracted Questions */}
      {extractedQuestions.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Extracted Questions ({extractedQuestions.length})
            </CardTitle>
            <CardDescription>
              Text-based questions found in the PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {extractedQuestions.map((question, index) => (
                <div key={question.id} className="p-4 border rounded-xl bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Q{question.questionNumber || index + 1}
                      </Badge>
                      <Badge className={getQuestionTypeColor(question.type)}>
                        {question.type.replace('-', ' ')}
                      </Badge>
                      {question.marks && (
                        <Badge variant="secondary" className="text-xs">
                          {question.marks} marks
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {question.text}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Paper Option for Pro+ users */}
      {showSaveOption && extractedQuestions.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Save Paper
            </CardTitle>
            <CardDescription>
              Save this paper to your collection for future reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {paperSaved ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Paper saved successfully
                  </div>
                ) : (
                  <span>Save this paper to access it later</span>
                )}
              </div>
              <Button 
                onClick={savePaper}
                disabled={isSaving || paperSaved}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : paperSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Save Paper
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Extracting text from PDF and analyzing questions with AI...</span>
        </div>
      )}
    </div>
  )
}
