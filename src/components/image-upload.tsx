"use client"

import React, { useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, CheckCircle, Image } from "lucide-react"

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
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleGalleryClick = () => {
    // Create a new file input without capture attribute for gallery access
    const galleryInput = document.createElement('input')
    galleryInput.type = 'file'
    galleryInput.accept = 'image/*'
    galleryInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    }
    galleryInput.click()
  }

  const handleRemoveImage = () => {
    onImageRemove()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleFileSelect(file)
            // Show visual feedback
            console.log('Image pasted successfully!')
          }
          break
        }
      }
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('paste', handlePaste)
      return () => {
        container.removeEventListener('paste', handlePaste)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} className={`flex items-center justify-center gap-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
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
        <div className="flex gap-2">
          <Button
            onClick={handleCameraClick}
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 text-primary border-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-md rounded-full flex items-center justify-center"
            title="Take photo"
          >
            <Camera className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleGalleryClick}
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 text-primary border-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-md rounded-full flex items-center justify-center"
            title="Choose from gallery"
          >
            <Image className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  )
}
