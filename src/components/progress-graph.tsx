"use client"

import { TrendingUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProgressGraphProps {
  versions: Array<{
    score: number
    max_score: number
    created_at: string
  }>
}

export function ProgressGraph({ versions }: ProgressGraphProps) {
  if (versions.length < 2) return null

  // Sort versions by date (oldest first)
  const sortedVersions = [...versions].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const maxScore = Math.max(...versions.map(v => v.max_score))
  const minScore = 0
  const scoreRange = maxScore - minScore

  return (
    <TooltipProvider>
      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Progress Over Time</span>
        </div>
        
        <div className="flex items-end justify-between h-16 gap-1">
          {sortedVersions.map((version, index) => {
            const percentage = ((version.score - minScore) / scoreRange) * 100
            const isLatest = index === sortedVersions.length - 1
            
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center flex-1">
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-300 cursor-pointer ${
                        isLatest 
                          ? 'bg-primary' 
                          : percentage >= 80 
                            ? 'bg-green-500' 
                            : percentage >= 60 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                      }`}
                      style={{ height: `${Math.max(percentage, 10)}%` }}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {Math.round((version.score / version.max_score) * 100)}%
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="z-50">
                  <p>Version {index + 1}: {version.score}/{version.max_score} ({Math.round((version.score / version.max_score) * 100)}%)</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>First attempt</span>
          <span>Latest attempt</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
