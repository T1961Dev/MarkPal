"use client"

import { useEffect, useState } from 'react'
import { Progress } from "@/components/ui/progress"
import { getUser, getQuestionLimit, User } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function QuestionsProgress() {
  const { user } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadUserData()
    } else {
      setLoading(false)
    }
  }, [user])

  // Refresh user data when questions are used
  useEffect(() => {
    const handleQuestionsUsed = () => {
      if (user) {
        loadUserData()
      }
    }

    window.addEventListener('questionsUsed', handleQuestionsUsed)
    return () => window.removeEventListener('questionsUsed', handleQuestionsUsed)
  }, [user])

  const loadUserData = async () => {
    if (!user) return
    
    try {
      const data = await getUser(user.id)
      setUserData(data)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || loading) {
    return null
  }

  if (!userData) {
    return null
  }

  const questionLimit = getQuestionLimit(userData.tier)
  const questionsUsed = questionLimit - userData.questionsLeft
  const percentage = Math.round((questionsUsed / questionLimit) * 100)

  return (
         <TooltipProvider>
       <Tooltip delayDuration={0}>
         <TooltipTrigger asChild>
           <div className="flex items-center gap-2 min-w-[120px]">
             <Progress 
               value={percentage} 
               className="h-2 w-16 bg-muted"
             />
             <span className="text-xs font-medium text-muted-foreground">
               {questionsUsed}/{questionLimit} questions used
             </span>
           </div>
         </TooltipTrigger>
          <TooltipContent className="border border-accent/50 bg-background shadow-lg text-foreground" sideOffset={5}>
           <p className="text-sm text-foreground">
             {questionsUsed} questions used
             <br />
             <span className="text-xs text-muted-foreground">
               {userData.tier === 'free' ? 'Free plan' : 
                userData.tier === 'basic' ? 'Basic plan' : 'Pro plan'}
             </span>
           </p>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
  )
}
