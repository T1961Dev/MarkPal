"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Save, X } from "lucide-react"

interface SaveQuestionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  onDiscard: () => void
  isLoading?: boolean
  defaultName?: string
}

export function SaveQuestionDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  onDiscard, 
  isLoading = false,
  defaultName = "" 
}: SaveQuestionDialogProps) {
  const [questionName, setQuestionName] = useState(defaultName)
  
  // Update question name when defaultName changes (e.g., when dialog opens with a new default)
  React.useEffect(() => {
    if (isOpen && defaultName) {
      setQuestionName(defaultName)
    }
  }, [isOpen, defaultName])

  const handleSave = () => {
    if (questionName.trim()) {
      onSave(questionName.trim())
    }
  }

  const handleDiscard = () => {
    setQuestionName("")
    onDiscard()
  }

  const handleClose = () => {
    setQuestionName("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Your Analysis
          </DialogTitle>
          <DialogDescription>
            Give your question a name to save it for future reference. You can view all your saved questions later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="question-name">Question Name</Label>
                <Input
                  id="question-name"
                  placeholder="e.g., Photosynthesis Question - Biology"
                  value={questionName}
                  onChange={(e) => setQuestionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && questionName.trim()) {
                      handleSave()
                    }
                  }}
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={!questionName.trim() || isLoading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isLoading ? "Saving..." : "Save Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
