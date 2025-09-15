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
  Eye, 
  Edit3, 
  RotateCcw,
  X,
  Clock
} from "lucide-react"
import { SavedQuestionDialog } from "@/components/saved-question-dialog"

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
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

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

  const handleViewVersion = (versionId: string) => {
    setSelectedVersionId(versionId)
    setViewDialogOpen(true)
  }

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false)
    setSelectedVersionId(null)
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                {questionName} - All Versions
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {versions.length} version{versions.length !== 1 ? 's' : ''} • Click to view or improve
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-3 p-4 bg-muted/50 rounded-lg">
              <Button onClick={handleStartFresh} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Fresh Attempt
              </Button>
              <div className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Latest: {formatDate(versions[0]?.created_at || '')}
              </div>
            </div>

            {/* Versions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {versions.map((version, index) => (
                <Card 
                  key={version.id} 
                  className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
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
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {version.question}
                    </p>
                    
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
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewVersion(version.id)}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleImprove(version)}
                        className="flex-1"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Improve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Version Dialog */}
      <SavedQuestionDialog
        isOpen={viewDialogOpen}
        onClose={handleCloseViewDialog}
        questionId={selectedVersionId}
      />
    </>
  )
}
