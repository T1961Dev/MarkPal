"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  BookOpen, 
  Target,
  CheckCircle,
  Calendar
} from "lucide-react"
import { SavedQuestion, getSavedQuestionById } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { AnswerHighlighter } from "./answer-highlighter"

interface SavedQuestionDialogProps {
  isOpen: boolean
  onClose: () => void
  questionId: string | null
}

export function SavedQuestionDialog({ 
  isOpen, 
  onClose, 
  questionId 
}: SavedQuestionDialogProps) {
  const { user } = useAuth()
  const [question, setQuestion] = useState<SavedQuestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [markSchemeExpanded, setMarkSchemeExpanded] = useState(false)

  useEffect(() => {
    if (isOpen && questionId && user) {
      loadQuestion()
    }
  }, [isOpen, questionId, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuestion = async () => {
    if (!user || !questionId) return
    
    setLoading(true)
    try {
      const questionData = await getSavedQuestionById(questionId, user.id)
      if (questionData) {
        setQuestion(questionData)
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Error loading question:', error)
      onClose()
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

  const handleClose = () => {
    setQuestion(null)
    setMarkSchemeExpanded(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {question?.name || "Loading..."}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading question...</p>
            </div>
          </div>
        ) : question ? (
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-4">
              {/* Header Info */}
              <div className="flex items-center gap-3 text-muted-foreground">
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

              {/* Question and Mark Scheme Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Question
                  </h3>
                  <Card className="border-2 border-primary/10 shadow-lg">
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.question}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Mark Scheme
                  </h3>
                  <Card className="border-2 border-primary/10 shadow-lg">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">Preview:</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMarkSchemeExpanded(!markSchemeExpanded)}
                            className="text-primary hover:text-primary/80 text-xs"
                          >
                            {markSchemeExpanded ? 'Show Less' : 'Show More'}
                          </Button>
                        </div>
                        <div className={`transition-all duration-300 ${markSchemeExpanded ? 'max-h-64 overflow-y-auto' : 'max-h-24 overflow-hidden'}`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{question.mark_scheme}</p>
                        </div>
                        {!markSchemeExpanded && (
                          <div className="text-xs text-muted-foreground">
                            Click &quot;Show More&quot; to see the full mark scheme
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Answer and Analysis Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Your Answer */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Your Answer
                  </h3>
                  <Card className="border-2 border-primary/10 shadow-lg">
                    <CardContent className="p-4">
                      <div className="text-sm leading-relaxed">
                        <AnswerHighlighter 
                          answerText={question.student_answer}
                          highlights={question.highlights}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div>

              {/* Detailed Feedback */}
              {question.detailed_feedback && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Detailed Feedback
                  </h3>
                  <Card className="border-2 border-primary/10 shadow-lg">
                    <CardContent className="p-4">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{question.detailed_feedback}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold mb-2">Question not found</h3>
            <p className="text-muted-foreground">The question you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
