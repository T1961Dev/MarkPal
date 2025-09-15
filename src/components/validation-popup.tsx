"use client"

import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ValidationPopupProps {
  message: string
  isVisible: boolean
  onClose: () => void
}

export function ValidationPopup({ message, isVisible, onClose }: ValidationPopupProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]">
      <Card className={`border-destructive bg-destructive text-destructive-foreground shadow-2xl backdrop-blur-sm transition-all duration-300 ${
        isAnimating ? "animate-in slide-in-from-top-2 fade-in-0" : "animate-out slide-out-to-top-2 fade-out-0"
      }`}>
        <CardContent className="flex items-center gap-3 px-4 py-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">{message}</span>
        </CardContent>
      </Card>
    </div>
  )
}
