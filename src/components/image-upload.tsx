"use client"

import React, { useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, CheckCircle } from "lucide-react"

interface ImageUploadProps {
  onImageUpload: (imageData: string) => void
  onImageRemove: () => void
  currentImage?: string
  className?: string
}

export function ImageUpload({ 
  onImageUpload, 
  onImageRemove, 
  currentImage, 
  className = ""
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onImageUpload(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = () => {
    onImageRemove()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {currentImage ? (
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Upload success</span>
          </Badge>
                     <Button
             onClick={handleRemoveImage}
             variant="ghost"
             size="sm"
             className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive rounded-full"
           >
            <CheckCircle className="w-5 h-5" />
          </Button>
        </div>
      ) : (
                 <Button
           onClick={handleCameraClick}
           variant="outline"
           size="sm"
           className="h-10 w-10 p-0 text-primary border-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-md rounded-full"
           title="Upload image"
         >
          <Camera className="w-5 h-5" />
        </Button>
      )}
    </div>
  )
}
