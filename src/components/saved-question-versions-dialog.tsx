"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Calendar, 
  Award, 
  Edit3, 
  RotateCcw,
  Clock
} from "lucide-react"

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

interface SavedQuestionVersionsDialogProps {
  isOpen: boolean
  onClose: () => void
  questionName: string
  versions: SavedQuestion[]
  onImproveVersion: (version: SavedQuestion) => void
  onStartFresh: (questionId: string) => void
}

export function SavedQuestionVersionsDialog({
  isOpen,
  onClose,
  questionName,
  versions,
  onImproveVersion,
  onStartFresh
}: SavedQuestionVersionsDialogProps) {

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
    onImproveVersion(version)
    onClose()
  }

  const handleStartFresh = () => {
    if (versions[0]?.question_id) {
      onStartFresh(versions[0].question_id)
      onClose()
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              {questionName} - All Versions
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {versions.length} version{versions.length !== 1 ? 's' : ''} • Click to view or improve
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/50 rounded-lg">
              <Button onClick={handleStartFresh} className="w-full sm:w-auto">
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Fresh Attempt
              </Button>
              <div className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start">
                <Clock className="h-4 w-4 mr-1" />
                Latest: {formatDate(versions[0]?.created_at || '')}
              </div>
            </div>

            {/* Versions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {versions.map((version, index) => (
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
                      {version.subject && (
                        <Badge variant="outline" className="text-xs">
                          {version.subject}
                        </Badge>
                      )}
                      {version.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {version.difficulty}
                        </Badge>
                      )}
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
        </DialogContent>
      </Dialog>

    </>
  )
}
