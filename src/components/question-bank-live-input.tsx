"use client"

import { useState, useEffect, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, XCircle, Sparkles, Save } from "lucide-react"

interface QuestionBankLiveInputProps {
  value: string
  onChange: (value: string) => void
  onAnalysis: (text: string) => void
  highlights: Array<{
    text: string;
    type: "success" | "warning" | "error" | "missing";
    tooltip?: string;
  }>
  isLoading: boolean
  placeholder?: string
  onSave?: () => void
  isSaving?: boolean
}

interface TextHighlight {
  text: string
  type: "success" | "warning" | "missing"
  start: number
  end: number
  tooltip?: string
}

export function QuestionBankLiveInput({ 
  value, 
  onChange, 
  onAnalysis,
  highlights,
  isLoading,
  placeholder = "Write your improved answer here...",
  onSave,
  isSaving = false
}: QuestionBankLiveInputProps) {
  const [showHighlights, setShowHighlights] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Debounced analysis
  useEffect(() => {
    if (!value.trim()) return

    const timeoutId = setTimeout(() => {
      onAnalysis(value)
    }, 1500) // 1.5 second delay

    return () => clearTimeout(timeoutId)
  }, [value, onAnalysis])

  // Get highlight stats
  const successHighlights = highlights?.filter(h => h.type === "success") || []
  const warningHighlights = highlights?.filter(h => h.type === "warning") || []
  const missingHighlights = highlights?.filter(h => h.type === "missing") || []

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Live Analysis
            </span>
          </div>
          
          {isLoading ? (
            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                Analyzing...
              </div>
            </Badge>
          ) : highlights && highlights.length > 0 ? (
            <div className="flex items-center gap-2">
              {successHighlights.length > 0 && (
                <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {successHighlights.length} matches
                </Badge>
              )}
              {warningHighlights.length > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {warningHighlights.length} partial
                </Badge>
              )}
            </div>
          ) : value.trim() ? (
            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
              <XCircle className="w-3 h-3 mr-1" />
              No matches yet
            </Badge>
          ) : null}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHighlights(!showHighlights)}
            className="text-xs"
          >
            {showHighlights ? "Hide" : "Show"} Feedback
          </Button>
          {onSave && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving || !value.trim()}
              className="text-xs"
            >
              <Save className="w-3 h-3 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>
      
      {/* Clean Textarea - No Overlay */}
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-32 text-base leading-relaxed border-2 focus:border-blue-400 transition-colors"
      />
      
      {/* Feedback Panel */}
      {showHighlights && highlights && highlights.length > 0 && (
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Analysis Results:
          </h4>
          
          {/* Success Matches */}
          {successHighlights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Good matches ({successHighlights.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {successHighlights.slice(0, 4).map((highlight, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                    "{highlight.text}"
                  </Badge>
                ))}
                {successHighlights.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{successHighlights.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Warning Matches */}
          {warningHighlights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Partial matches ({warningHighlights.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {warningHighlights.slice(0, 3).map((highlight, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                    "{highlight.text}"
                  </Badge>
                ))}
                {warningHighlights.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{warningHighlights.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Missing Points */}
          {missingHighlights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  Missing points ({missingHighlights.length})
                </span>
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                Consider adding more detail to these areas
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Help Text */}
      {!value.trim() && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
          Start typing your improved answer above. I'll analyze it in real-time!
        </div>
      )}
    </div>
  )
}
