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
  const parseMarkScheme = (markSchemeText: string): MarkSchemePoint[] => {
    if (!markSchemeText.trim()) {
      return []
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
      line.match(/^\d+\./) // Numbered points like "1. biconcave shape"
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

    // Parse structured mark scheme
    let allExtraInfo: string[] = []
    let aoSpecRef = ''
    let inImportantNotes = false
    
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
        points.push({
          answer: answerText,
          extraInfo: undefined,
          mark: parseInt(markMatch[1]),
          aoSpecRef: aoSpecRef
        })
      } else if (trimmedLine.match(/^\d+\./)) {
        // This is a numbered answer point
        const answerText = trimmedLine.replace(/^\d+\.\s*/, '').trim()
        points.push({
          answer: answerText,
          extraInfo: undefined,
          mark: 1, // Default to 1 mark per point
          aoSpecRef: aoSpecRef
        })
      } else if (trimmedLine.startsWith('-')) {
        // This is an additional point
        const answerText = trimmedLine.replace(/^-\s*/, '').trim()
        points.push({
          answer: answerText,
          extraInfo: undefined,
          mark: 1, // Default to 1 mark per point
          aoSpecRef: aoSpecRef
        })
      }
    }
    
    // Add all extra info from Important Notes as separate rows
    if (allExtraInfo.length > 0) {
      // Add each extra info item as a separate row
      allExtraInfo.forEach(extraInfo => {
        points.push({
          answer: '',
          extraInfo: extraInfo,
          mark: 0,
          aoSpecRef: ''
        })
      })
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
            Mark Scheme - Question {actualQuestionNumber}
          </DialogTitle>
        </DialogHeader>
        
        {/* Debug info - remove this later */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 bg-gray-100 rounded-lg text-xs">
            <div><strong>Original Question Number:</strong> {questionNumber}</div>
            <div><strong>Extracted Question Number:</strong> {actualQuestionNumber}</div>
            <div><strong>Max Marks:</strong> {maxMarks}</div>
            <div><strong>Raw Mark Scheme:</strong> {markScheme.substring(0, 200)}...</div>
            <div><strong>Parsed Points:</strong> {markSchemePoints.length}</div>
            <div><strong>Has Extra Info:</strong> {markSchemePoints.some(point => point.extraInfo) ? 'Yes' : 'No'}</div>
            <div><strong>All Lines:</strong> {markScheme.split('\n').filter(line => line.trim()).map((line, i) => `${i}: "${line.trim()}"`).join(', ')}</div>
            <div><strong>Extra Info Captured:</strong> {allExtraInfo.length > 0 ? allExtraInfo.join(' | ') : 'None'}</div>
            <div><strong>Points:</strong> {JSON.stringify(markSchemePoints, null, 2)}</div>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Mark Scheme Table or Plain Text */}
          {markSchemePoints.length > 0 ? (
            // Structured mark scheme table
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-900">
                  <div className="col-span-2">Question</div>
                  <div className="col-span-5">Answers</div>
                  <div className="col-span-3">Extra information</div>
                  <div className="col-span-1 text-center">Mark</div>
                  <div className="col-span-1">AO / Spec Ref.</div>
                </div>
              </div>
              
              {/* Content */}
              <div className="divide-y divide-gray-200">
                {/* First, show all extra information rows at the top */}
                {markSchemePoints
                  .filter(point => point.extraInfo && !point.answer)
                  .map((point, index) => (
                  <div key={`extra-${index}`} className="px-4 py-3">
                    <div className="grid grid-cols-12 gap-4 text-sm">
                      <div className="col-span-2 font-semibold text-gray-900">
                        {index === 0 ? actualQuestionNumber : ''}
                      </div>
                      <div className="col-span-5 text-gray-800">
                        {/* Empty for extra info rows */}
                      </div>
                      <div className="col-span-3 text-gray-700">
                        <span className={cn(
                          "text-xs",
                          point.extraInfo.trim().toLowerCase().startsWith('do not accept') 
                            ? "font-semibold text-red-700" 
                            : point.extraInfo.trim().toLowerCase().startsWith('allow')
                            ? "text-green-700"
                            : "text-gray-600"
                        )}>
                          {point.extraInfo.trim()}
                        </span>
                      </div>
                      <div className="col-span-1 text-center font-semibold text-gray-900">
                        {/* Empty for extra info rows */}
                      </div>
                      <div className="col-span-1 text-gray-700">
                        {/* Empty for extra info rows */}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Then show all answer points */}
                {markSchemePoints
                  .filter(point => point.answer)
                  .map((point, index) => (
                  <div key={`answer-${index}`} className="px-4 py-3">
                    <div className="grid grid-cols-12 gap-4 text-sm">
                      <div className="col-span-2 font-semibold text-gray-900">
                        {index === 0 ? actualQuestionNumber : ''}
                      </div>
                      <div className="col-span-5 text-gray-800">
                        <div className="space-y-1">
                          {point.answer.split(' or ').map((answer, answerIndex) => (
                            <div key={answerIndex} className="flex items-center">
                              {answerIndex > 0 && (
                                <span className="font-semibold text-gray-900 mr-2">or</span>
                              )}
                              <span>{answer.trim()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="col-span-3 text-gray-700">
                        {point.extraInfo && (
                          <div className="space-y-1">
                            {point.extraInfo.split(';').map((info, infoIndex) => (
                              <div key={infoIndex} className="flex items-start">
                                <span className={cn(
                                  "text-xs",
                                  info.trim().toLowerCase().startsWith('do not accept') 
                                    ? "font-semibold text-red-700" 
                                    : info.trim().toLowerCase().startsWith('allow')
                                    ? "text-green-700"
                                    : "text-gray-600"
                                )}>
                                  {info.trim()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-1 text-center font-semibold text-gray-900">
                        {point.mark > 0 ? point.mark : ''}
                      </div>
                      <div className="col-span-1 text-gray-700">
                        {point.aoSpecRef && index === 0 && (
                          <div className="space-y-1">
                            {point.aoSpecRef.split(',').map((ref, refIndex) => (
                              <div key={refIndex}>{ref.trim()}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
