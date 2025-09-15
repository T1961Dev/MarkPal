"use client"

import { useState, useEffect, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, XCircle, Sparkles, Target, Eye, EyeOff } from "lucide-react"

interface LiveAnswerInputProps {
  value: string
  onChange: (value: string) => void
  markScheme: string
  question: string
  maxMarks: string
  onMaxMarksChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  autoFocus?: boolean
}

interface MarkSchemeLevel {
  level: string
  marks: number
  criteria: string[]
  found: boolean
}

interface TextHighlight {
  text: string
  type: "success" | "warning" | "missing"
  start: number
  end: number
  tooltip?: string
  level?: string
}

export function LiveAnswerInput({ 
  value, 
  onChange, 
  markScheme, 
  question, 
  maxMarks, 
  onMaxMarksChange,
  onKeyDown, 
  autoFocus 
}: LiveAnswerInputProps) {
  const [highlights, setHighlights] = useState<TextHighlight[]>([])
  const [markSchemeLevels, setMarkSchemeLevels] = useState<MarkSchemeLevel[]>([])
  const [score, setScore] = useState(0)
  const [showFeedback, setShowFeedback] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Parse mark scheme into proper levels and criteria
  useEffect(() => {
    if (!markScheme.trim()) {
      setMarkSchemeLevels([])
      return
    }

    const levels: MarkSchemeLevel[] = []
    const lines = markScheme.split('\n').filter(line => line.trim())
    
    let currentLevel: MarkSchemeLevel | null = null
    
    lines.forEach(line => {
      // Look for level headers like "Level 3 (7-10 marks):" or "Band 3 (7-10 marks):"
      const levelMatch = line.match(/(?:Level|Band)\s*(\d+)\s*\((\d+)(?:[-\s]*(\d+))?\s*marks?\)/i)
      
      if (levelMatch) {
        // Save previous level if exists
        if (currentLevel) {
          levels.push(currentLevel)
        }
        
        const levelNum = levelMatch[1]
        const startMarks = parseInt(levelMatch[2])
        const endMarks = levelMatch[3] ? parseInt(levelMatch[3]) : startMarks
        const avgMarks = Math.ceil((startMarks + endMarks) / 2)
        
        currentLevel = {
          level: `Level ${levelNum}`,
          marks: avgMarks,
          criteria: [],
          found: false
        }
      } else if (currentLevel && line.trim()) {
        // Add criteria to current level
        // Remove bullet points, numbers, etc. and clean up
        const cleanLine = line.replace(/^[•\-\*\d\.\)\s]+/, '').trim()
        if (cleanLine && cleanLine.length > 5) {
          currentLevel.criteria.push(cleanLine)
        }
      }
    })
    
    // Add the last level
    if (currentLevel) {
      levels.push(currentLevel)
    }

    // If no structured levels found, try to parse by sentences
    if (levels.length === 0) {
      const sentences = markScheme.split(/[.!?]+/).filter(s => s.trim().length > 10)
      if (sentences.length > 0) {
        const maxMarksValue = parseInt(maxMarks) || 10
        const marksPerSentence = Math.max(1, Math.floor(maxMarksValue / sentences.length))
        
        sentences.forEach((sentence, index) => {
          const cleanSentence = sentence.replace(/^[•\-\*\d\.\)\s]+/, '').trim()
          if (cleanSentence) {
            levels.push({
              level: `Point ${index + 1}`,
              marks: marksPerSentence,
              criteria: [cleanSentence],
              found: false
            })
          }
        })
      }
    }

    setMarkSchemeLevels(levels)
  }, [markScheme, maxMarks])

  // Real-time analysis of answer against mark scheme
  useEffect(() => {
    if (!value.trim() || markSchemeLevels.length === 0) {
      setHighlights([])
      setScore(0)
      return
    }

    const newHighlights: TextHighlight[] = []
    let totalScore = 0
    const answerLower = value.toLowerCase()
    
    // Check each mark scheme level
    markSchemeLevels.forEach(level => {
      let levelFound = false
      let levelScore = 0
      
      // Check each criterion in the level
      level.criteria.forEach(criterion => {
        const criterionLower = criterion.toLowerCase()
        
        // Extract key phrases from criterion (3+ word phrases)
        const words = criterionLower.split(/\s+/)
        const phrases: string[] = []
        
        // Generate 3-5 word phrases
        for (let i = 0; i <= words.length - 3; i++) {
          for (let j = 3; j <= Math.min(5, words.length - i); j++) {
            const phrase = words.slice(i, i + j).join(' ')
            if (phrase.length > 8) { // Only meaningful phrases
              phrases.push(phrase)
            }
          }
        }
        
        // Check if any phrase is found in the answer
        let criterionFound = false
        phrases.forEach(phrase => {
          const index = answerLower.indexOf(phrase)
          if (index !== -1) {
            criterionFound = true
            levelFound = true
            
            // Add highlight for this phrase
            newHighlights.push({
              text: value.substring(index, index + phrase.length),
              type: "success",
              start: index,
              end: index + phrase.length,
              tooltip: `Matches: ${criterion}`,
              level: level.level
            })
          }
        })
        
        if (criterionFound) {
          levelScore += level.marks / level.criteria.length
        }
      })
      
      totalScore += levelScore
    })

    // Remove overlapping highlights (keep the longest ones)
    const sortedHighlights = newHighlights.sort((a, b) => (b.end - b.start) - (a.end - a.start))
    const finalHighlights: TextHighlight[] = []
    
    sortedHighlights.forEach(highlight => {
      // Check if this highlight overlaps with any existing one
      const overlaps = finalHighlights.some(existing => 
        (highlight.start < existing.end && highlight.end > existing.start)
      )
      
      if (!overlaps) {
        finalHighlights.push(highlight)
      }
    })

    setHighlights(finalHighlights)
    setScore(Math.min(parseInt(maxMarks) || 10, Math.round(totalScore)))
  }, [value, markSchemeLevels, maxMarks])

  // Render highlighted text
  const renderHighlightedText = () => {
    if (!showFeedback || highlights.length === 0) {
      return value
    }

    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start)
    let result = []
    let lastIndex = 0

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        result.push(value.substring(lastIndex, highlight.start))
      }

      // Add highlighted text
      const highlightClass = highlight.type === "success" ? "bg-green-200 dark:bg-green-800/30" :
                           highlight.type === "warning" ? "bg-yellow-200 dark:bg-yellow-800/30" :
                           "bg-blue-200 dark:bg-blue-800/30"

      result.push(
        <span 
          key={index}
          className={`${highlightClass} rounded px-1 cursor-help live-highlight-pulse`}
          title={highlight.tooltip}
        >
          {highlight.text}
        </span>
      )

      lastIndex = highlight.end
    })

    // Add remaining text
    if (lastIndex < value.length) {
      result.push(value.substring(lastIndex))
    }

    return result
  }

  return (
    <div className="space-y-4">
      {/* Header with score and toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <span className="text-lg font-medium">Live Analysis</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score:</span>
            <Badge variant="outline" className="text-lg px-3 py-1 live-score-update">
              {score} / {maxMarks || 10}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFeedback(!showFeedback)}
            className="flex items-center gap-2"
          >
            {showFeedback ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showFeedback ? "Hide" : "Show"} Feedback
          </Button>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Textarea with highlighting - takes up 2/3 of space */}
        <div className="lg:col-span-2">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Start typing your answer... I'll highlight content that matches the mark scheme!"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              className="min-h-[200px] text-lg rounded-2xl border-2 border-blue-100 focus:border-accent transition-all duration-300 focus:shadow-lg"
              autoFocus={autoFocus}
            />
            
            {/* Highlight overlay */}
            {showFeedback && highlights.length > 0 && (
              <div className="absolute inset-0 pointer-events-none p-3 text-lg leading-relaxed">
                <div className="whitespace-pre-wrap">
                  {renderHighlightedText()}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-4">
            <Label htmlFor="maxMarks" className="text-lg font-medium">
              Max Marks (optional):
            </Label>
            <Input
              id="maxMarks"
              type="number"
              placeholder="10"
              value={maxMarks}
              onChange={(e) => onMaxMarksChange(e.target.value)}
              className="w-24 text-lg rounded-xl border-2 border-blue-100 focus:border-accent"
            />
          </div>
        </div>
        
        {/* Compact feedback panel - takes up 1/3 of space */}
        {showFeedback && markSchemeLevels.length > 0 && (
          <div className="lg:col-span-1">
            <Card className="rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  Mark Scheme Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {markSchemeLevels.map((level, index) => {
                  const isFound = highlights.some(h => h.level === level.level && h.type === "success")
                  return (
                    <div key={index} className={`p-2 rounded-lg border text-sm ${
                      isFound ? 'bg-green-100 dark:bg-green-900/20 border-green-300' : 'bg-red-100 dark:bg-red-900/20 border-red-300'
                    }`}>
                      <div className="flex items-start gap-2">
                        {isFound ? (
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">
                            {level.level} ({level.marks} marks)
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isFound ? "✓ Covered" : "✗ Missing"}
                          </p>
                          {!isFound && level.criteria[0] && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {level.criteria[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Success highlights summary - only show when there are matches */}
      {showFeedback && highlights.filter(h => h.type === "success").length > 0 && (
        <Card className="rounded-2xl border-2 border-green-200 bg-green-50 dark:bg-green-900/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Matches Found ({highlights.filter(h => h.type === "success").length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {highlights
                .filter(h => h.type === "success")
                .slice(0, 5) // Only show first 5 matches
                .map((highlight, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-green-200 dark:bg-green-800/30">
                    "{highlight.text}"
                  </Badge>
                ))}
              {highlights.filter(h => h.type === "success").length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{highlights.filter(h => h.type === "success").length - 5} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
