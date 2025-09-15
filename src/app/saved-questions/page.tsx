"use client"

import { useEffect } from 'react'
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function SavedQuestionsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push("/dashboard/saved-questions")
    } else {
      router.push("/")
    }
  }, [user, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
