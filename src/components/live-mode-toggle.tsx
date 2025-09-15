"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"

interface LiveModeToggleProps {
  isLiveMode: boolean
  onToggle: (isLive: boolean) => void
}

export function LiveModeToggle({ isLiveMode, onToggle }: LiveModeToggleProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border-2 border-primary/20 shadow-lg">
      <div className="flex items-center gap-2">
        <div className={`w-12 h-6 rounded-full transition-all duration-300 ease-in-out cursor-pointer relative ${
          isLiveMode ? 'bg-primary' : 'bg-muted'
        }`} onClick={() => onToggle(!isLiveMode)}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ease-in-out shadow-md ${
            isLiveMode ? 'left-7' : 'left-1'
          }`} />
        </div>
        <span className="text-sm font-medium text-foreground">
          {isLiveMode ? 'Live Mode' : 'Standard Mode'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isLiveMode ? (
          <Play className="w-4 h-4 text-primary animate-pulse" />
        ) : (
          <Pause className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  )
}
