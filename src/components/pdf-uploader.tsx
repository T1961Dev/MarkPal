"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, X, Loader2, CheckCircle } from "lucide-react"
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
  const [extractedText, setExtractedText] = useState("")
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

    if (file.type !== "application/pdf") return onError("Please select a PDF file")
    if (file.size > 10 * 1024 * 1024) return onError("File size must be less than 10MB")

    setUploadedFile(file)
    setIsUploading(true)
    try {
      await processPDF(file)
    } catch (err) {
      console.error("Error processing PDF:", err)
      onError("Failed to process PDF. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const processPDF = async (file: File) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (savedPaperId) formData.append("paperId", savedPaperId)

      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: formData,
      })

      if (!response.ok) {
        let msg = `Server error: ${response.status} ${response.statusText}`
        try {
          const errJson = await response.json()
          msg = errJson.error || msg
        } catch {}
        throw new Error(msg)
      }

      const result = await response.json()
      if (!result.success) throw new Error(result.error || "Failed to extract questions")

      const { questions, fullText, pdfMetadata } = result.data
      setExtractedText(fullText)
      setExtractedQuestions(questions)
      setPdfMetadata(pdfMetadata)
      onQuestionsExtracted(questions, fullText, pdfMetadata)
    } catch (err) {
      console.error("PDF processing error:", err)
      onError(err instanceof Error ? err.message : "Failed to process PDF. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const savePaper = async () => {
    if (!uploadedFile || !extractedText || !pdfMetadata) return onError("No paper data to save")
    setIsSaving(true)
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pdfMetadata.title || uploadedFile.name.replace(".pdf", ""),
          filename: uploadedFile.name,
          fileSize: uploadedFile.size,
          subject: pdfMetadata.subject || "other",
          level: "mixed",
          examBoard: null,
          year: null,
          extractedText,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPaperSaved(true)
        setSavedPaperId(data.data.id)
        onPaperSaved?.(data.data.id)
      } else onError(data.error || "Failed to save paper")
    } catch (err) {
      console.error("Error saving paper:", err)
      onError("Failed to save paper. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const determineQuestionType = (text: string): ExtractedQuestion["type"] => {
    const lower = text.toLowerCase()
    if (lower.includes("choose") || lower.includes("select") || lower.includes("tick") || lower.includes("circle")) return "multiple-choice"
    if (lower.includes("explain") || lower.includes("describe") || lower.includes("discuss") || lower.includes("analyze") || lower.includes("evaluate")) return "essay"
    if (lower.includes("what") || lower.includes("how") || lower.includes("why") || lower.includes("when") || lower.includes("where")) return "short-answer"
    return "text"
  }

  // Optional helper (currently unused)
  const extractQuestionsFromText = (text: string): ExtractedQuestion[] => {
    const questions: ExtractedQuestion[] = []
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
    let current: Partial<ExtractedQuestion> | null = null
    let questionText = ""
    let counter = 1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const patterns = [/^(\d+)[\.\)]\s*(.+)/, /^Question\s*(\d+)[:\.\)]\s*(.+)/i, /^Q(\d+)[:\.\)]\s*(.+)/i]
      let isQuestion = false
      let number = ""
      let content = ""

      for (const p of patterns) {
        const m = line.match(p)
        if (m) {
          isQuestion = true
          number = m[1]
          content = m[2]
          break
        }
      }

      const keywords = ["what","how","why","when","where","which","who","explain","describe","compare","contrast","analyze","evaluate","discuss"]
      if (!isQuestion && line.includes("?") && keywords.some(k => line.toLowerCase().includes(k)) && line.length > 20) {
        isQuestion = true
        number = String(counter++)
        content = line
      }

      if (isQuestion) {
        if (current && questionText.trim()) {
          questions.push({
            id: `q-${questions.length + 1}`,
            text: questionText.trim(),
            questionNumber: current.questionNumber,
            marks: current.marks,
            type: determineQuestionType(questionText),
          })
        }
        current = { questionNumber: number }
        questionText = content
        const marksMatch = line.match(/\((\d+)\s*marks?\)/i)
        if (marksMatch) current.marks = marksMatch[1]
      } else if (current) {
        questionText += " " + line
        const next = lines[i + 1]
        const nextIsQ = i + 1 < lines.length &&
          (patterns.some(p => p.test(next)) ||
            (next.includes("?") && keywords.some(k => next.toLowerCase().includes(k))))
        if (nextIsQ || i === lines.length - 1) {
          questions.push({
            id: `q-${questions.length + 1}`,
            text: questionText.trim(),
            questionNumber: current.questionNumber,
            marks: current.marks,
            type: determineQuestionType(questionText),
          })
          current = null
          questionText = ""
        }
      }
    }

    if (current && questionText.trim()) {
      questions.push({
        id: `q-${questions.length + 1}`,
        text: questionText.trim(),
        questionNumber: current.questionNumber,
        marks: current.marks,
        type: determineQuestionType(questionText),
      })
    }

    return questions
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setExtractedText("")
    setExtractedQuestions([])
    setPdfMetadata(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") return onError("Please select a PDF file")
    setUploadedFile(file)
    setIsUploading(true)
    processPDF(file).finally(() => setIsUploading(false))
  }

  const getQuestionTypeColor = (type: ExtractedQuestion["type"]) => {
    switch (type) {
      case "multiple-choice": return "bg-blue-100 text-blue-800"
      case "essay": return "bg-purple-100 text-purple-800"
      case "short-answer": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
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
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
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
              {isUploading || isProcessing ? "Processing PDF..." : "Upload Exam Paper"}
            </p>
            <p className="text-sm text-muted-foreground">PDF files up to 10MB supported</p>
            <p className="text-xs text-muted-foreground mt-1">AI-powered question extraction</p>
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
              <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          {pdfMetadata && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {pdfMetadata.title && <div><span className="font-medium text-muted-foreground">Title:</span><p>{pdfMetadata.title}</p></div>}
                {pdfMetadata.author && <div><span className="font-medium text-muted-foreground">Author:</span><p>{pdfMetadata.author}</p></div>}
                {pdfMetadata.subject && <div><span className="font-medium text-muted-foreground">Subject:</span><p>{pdfMetadata.subject}</p></div>}
                {pdfMetadata.creator && <div><span className="font-medium text-muted-foreground">Creator:</span><p>{pdfMetadata.creator}</p></div>}
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
            <CardDescription>Text-based questions found in the PDF</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {extractedQuestions.map((q, i) => (
                <div key={q.id} className="p-4 border rounded-xl bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Q{q.questionNumber || i + 1}</Badge>
                      <Badge className={getQuestionTypeColor(q.type)}>{q.type.replace("-", " ")}</Badge>
                      {q.marks && <Badge variant="secondary" className="text-xs">{q.marks} marks</Badge>}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed">{q.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Paper */}
      {showSaveOption && extractedQuestions.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Save Paper</CardTitle>
            <CardDescription>Save this paper for future reference</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {paperSaved ? (
                  <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-4 h-4" />Paper saved</div>
                ) : (
                  <span>Save this paper to access later</span>
                )}
              </div>
              <Button onClick={savePaper} disabled={isSaving || paperSaved} className="gap-2">
                {isSaving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) :
                 paperSaved ? (<><CheckCircle className="w-4 h-4" />Saved</>) :
                 (<><FileText className="w-4 h-4" />Save Paper</>)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Extracting text and analyzing questions...</span>
        </div>
      )}
    </div>
  )
}
