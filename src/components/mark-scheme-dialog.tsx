"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarkSchemePoint {
  answer: string
  extraInfo?: string
  mark: number
  aoSpecRef?: string
}

interface MarkSchemeDialogProps {
  questionNumber: string
  markScheme: string
  maxMarks: number
  children?: React.ReactNode
}

export function MarkSchemeDialog({ 
  questionNumber, 
  markScheme, 
  maxMarks, 
  children 
}: MarkSchemeDialogProps) {
  const [open, setOpen] = useState(false)

  // Extract question number from mark scheme text
  const extractQuestionNumber = (markSchemeText: string): string => {
    // Look for patterns like "Question 09.2", "Q9.2", "09.2", etc.
    const questionMatch = markSchemeText.match(/Question\s+(\d+\.?\d*)|Q(\d+\.?\d*)|^(\d+\.?\d*)/i)
    if (questionMatch) {
      return questionMatch[1] || questionMatch[2] || questionMatch[3] || 'Q'
    }
    return 'Q'
  }

  // Parse the mark scheme text into structured data
  const parseMarkScheme = (markSchemeText: string): { points: MarkSchemePoint[]; extraInfo: string[] } => {
    if (!markSchemeText.trim()) {
      return { points: [], extraInfo: [] }
    }

    const points: MarkSchemePoint[] = []
    const lines = markSchemeText.split('\n').filter(line => line.trim())
    
    // Try to detect if this is a structured mark scheme
    const hasStructuredFormat = lines.some(line => 
      line.includes('Acceptable Answers:') ||
      line.includes('Additional Acceptable Points:') ||
      line.includes('(1 mark)') ||
      line.includes('(2 marks)') ||
      line.includes('(3 marks)') ||
      line.includes('(4 marks)') ||
      line.includes('do not accept') ||
      line.includes('ignore') ||
      line.includes('AO / Spec Ref:') ||
      line.match(/^\d+\./) || // Numbered points like "1. biconcave shape"
      line.includes('Award marks for:') || // Question bank format
      line.match(/\d+\)/) // Numbered points like "1) Light energy"
    )

    if (!hasStructuredFormat) {
      // If it's just plain text, display it as a single point
      return {
        points: [{
          answer: markSchemeText.trim(),
          mark: maxMarks
        }],
        extraInfo: []
      }
    }

    // Check if this is the question bank format (Award marks for: 1) point (1 mark), 2) point (1 mark))
    const isQuestionBankFormat = lines.some(line => line.includes('Award marks for:'))
    
    if (isQuestionBankFormat) {
      // Parse question bank format
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue
        
        if (trimmedLine.includes('Award marks for:')) {
          // Extract all the numbered points from this line
          const pointsText = trimmedLine.replace('Award marks for:', '').trim()
          
          // Split by numbered points (1), 2), 3), etc.)
          const pointMatches = pointsText.match(/\d+\)[^)]*\([^)]*mark[^)]*\)/g)
          
          if (pointMatches) {
            for (const pointMatch of pointMatches) {
              // Extract the point text and mark
              const markMatch = pointMatch.match(/\((\d+)\s*mark[^)]*\)/)
              const pointText = pointMatch.replace(/\d+\)\s*/, '').replace(/\s*\([^)]*mark[^)]*\)/, '').trim()
              
              if (pointText && markMatch) {
                points.push({
                  answer: pointText,
                  mark: parseInt(markMatch[1]),
                  aoSpecRef: ''
                })
              }
            }
          }
        }
      }
      
      return { points, extraInfo: [] }
    }

    // Parse structured mark scheme
    let allExtraInfo: string[] = []
    let aoSpecRef = ''
    let inImportantNotes = false
    let currentAnswerPoint: MarkSchemePoint | null = null
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      // Skip headers
      if (trimmedLine.includes('Mark Scheme:') || 
          trimmedLine.includes('Acceptable Answers:') ||
          trimmedLine.includes('Additional Acceptable Points:') ||
          trimmedLine.includes('Total:')) {
        continue
      }
      
      // Check if we're in Important Notes section
      if (trimmedLine.includes('Important Notes:')) {
        inImportantNotes = true
        continue
      }
      
      // Extract AO/Spec Ref
      if (trimmedLine.startsWith('AO / Spec Ref:')) {
        aoSpecRef = trimmedLine.replace('AO / Spec Ref:', '').trim()
        continue
      }
      
      // If we're in Important Notes, collect ALL extra info
      if (inImportantNotes) {
        // Collect ALL lines in Important Notes section, not just specific keywords
        allExtraInfo.push(trimmedLine)
        continue
      }
      
      // Check if this line contains a mark (number in parentheses)
      const markMatch = trimmedLine.match(/\((\d+)\s*marks?\)/)
      if (markMatch) {
        // Extract answer text and mark
        const answerText = trimmedLine.replace(/\s*\(\d+\s*marks?\)/, '').trim()
        currentAnswerPoint = {
          answer: answerText,
          extraInfo: undefined,
          mark: parseInt(markMatch[1]),
          aoSpecRef: aoSpecRef
        }
        points.push(currentAnswerPoint)
      } else if (trimmedLine.match(/^\d+\./)) {
        // This is a numbered answer point
        const answerText = trimmedLine.replace(/^\d+\.\s*/, '').trim()
        currentAnswerPoint = {
          answer: answerText,
          extraInfo: undefined,
          mark: 1, // Default to 1 mark per point
          aoSpecRef: aoSpecRef
        }
        points.push(currentAnswerPoint)
      } else if (trimmedLine.startsWith('-')) {
        // This is an additional point
        const answerText = trimmedLine.replace(/^-\s*/, '').trim()
        currentAnswerPoint = {
          answer: answerText,
          extraInfo: undefined,
          mark: 1, // Default to 1 mark per point
          aoSpecRef: aoSpecRef
        }
        points.push(currentAnswerPoint)
      } else if (trimmedLine.startsWith('-') && (trimmedLine.includes('ignore') || trimmedLine.includes('do not accept') || trimmedLine.includes('allow'))) {
        // This is extra information that should be associated with the current answer
        if (currentAnswerPoint) {
          if (!currentAnswerPoint.extraInfo) {
            currentAnswerPoint.extraInfo = trimmedLine
          } else {
            currentAnswerPoint.extraInfo += '; ' + trimmedLine
          }
        } else {
          // If no current answer point, create a point just for this extra info
          points.push({
            answer: '',
            extraInfo: trimmedLine,
            mark: 0,
            aoSpecRef: aoSpecRef
          })
        }
      }
    }
    
    // Add all extra info from Important Notes to all answer points
    if (allExtraInfo.length > 0) {
      if (points.length > 0) {
        // Add extra info to all answer points
        points.forEach(point => {
          if (!point.extraInfo) {
            point.extraInfo = allExtraInfo.join('; ')
          } else {
            point.extraInfo += '; ' + allExtraInfo.join('; ')
          }
        })
      } else {
        // If no answer points, create a general info point
        points.push({
          answer: '',
          extraInfo: allExtraInfo.join('; '),
          mark: 0,
          aoSpecRef: ''
        })
      }
    }
    
    // If no structured points were found, create a single point with the full text
    if (points.length === 0 && markSchemeText.trim()) {
      points.push({
        answer: markSchemeText.trim(),
        mark: maxMarks
      })
    }
    
    return { points, extraInfo: allExtraInfo }
  }

  const { points: markSchemePoints, extraInfo: allExtraInfo } = parseMarkScheme(markScheme)
  const actualQuestionNumber = extractQuestionNumber(markScheme)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <FileText className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        className="!w-[95vw] !max-w-none max-h-[80vh] overflow-y-auto" 
        style={{ maxWidth: 'none !important', width: '95vw !important' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mark Scheme
          </DialogTitle>
        </DialogHeader>
        
        
        <div className="space-y-4">
          {/* Mark Scheme Table */}
          {markSchemePoints.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left w-28">
                      Question
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left">
                      Answers
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left">
                      Extra information
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left w-16">
                      Mark
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left w-28">
                      AO / Spec Ref.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-semibold">
                      {actualQuestionNumber}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 align-top">
                      <ul className="list-disc list-inside space-y-1">
                        {markSchemePoints
                          .filter(point => point.answer)
                          .map((point, index) => (
                          <li key={`answer-${index}`}>
                            {point.answer.split(' or ').map((answer, answerIndex) => (
                              <span key={answerIndex}>
                                {answerIndex > 0 && (
                                  <>
                                    <br />
                                    <span className="italic">or</span>{" "}
                                  </>
                                )}
                                {answer.trim()}
                              </span>
                            ))}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 align-top">
                      <ul className="list-disc list-inside space-y-1">
                        {(() => {
                          // Collect all unique extra info items
                          const allExtraInfo = new Set<string>()
                          markSchemePoints.forEach(point => {
                            if (point.extraInfo) {
                              point.extraInfo.split(';').forEach(info => {
                                const trimmed = info.trim()
                                if (trimmed) {
                                  allExtraInfo.add(trimmed)
                                }
                              })
                            }
                          })
                          
                          return Array.from(allExtraInfo).map((info, index) => (
                            <li key={`extra-${index}`}>
                              <span className={cn(
                                info.toLowerCase().startsWith('do not accept') 
                                  ? "font-semibold text-red-600" 
                                  : info.toLowerCase().startsWith('allow')
                                  ? "text-green-700"
                                  : "text-gray-600"
                              )}>
                                {info}
                              </span>
                            </li>
                          ))
                        })()}
                      </ul>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center align-top">
                      {markSchemePoints
                        .filter(point => {
                          // Only show marks for actual answer points, not extra info
                          return point.answer && 
                                 point.mark > 0 && 
                                 !point.answer.toLowerCase().includes('allow') &&
                                 !point.answer.toLowerCase().includes('ignore') &&
                                 !point.answer.toLowerCase().includes('do not accept') &&
                                 point.answer.trim() !== ''
                        })
                        .map((point, index) => (
                        <div key={`mark-${index}`}>{point.mark}</div>
                      ))}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 align-top">
                      {(() => {
                        // Get unique AO/Spec Ref values
                        const aoSpecRefs = new Set<string>()
                        markSchemePoints.forEach(point => {
                          if (point.aoSpecRef) {
                            point.aoSpecRef.split(',').forEach(ref => {
                              const trimmed = ref.trim()
                              if (trimmed) {
                                aoSpecRefs.add(trimmed)
                              }
                            })
                          }
                        })
                        
                        return Array.from(aoSpecRefs).map((ref, index) => (
                          <div key={`ao-${index}`}>{ref}</div>
                        ))
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            // Plain text mark scheme
            <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Mark Scheme</h3>
                  <Badge variant="outline" className="text-sm">
                    {maxMarks} marks
                  </Badge>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-800 font-mono text-sm leading-relaxed">
                    {markScheme}
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          {/* Total Marks */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Total marks available: <span className="font-semibold">{maxMarks}</span>
            </div>
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
