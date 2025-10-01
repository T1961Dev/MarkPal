"use client"

import { useEffect, useState } from 'react'
import { Progress } from "@/components/ui/progress"
import { getUser, getQuestionLimit, User } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface QuestionsProgressProps {
  userData: User | null
}

export function QuestionsProgress({ userData }: QuestionsProgressProps) {
  const { user } = useAuth()
  const [localUserData, setLocalUserData] = useState<User | null>(userData)

  // Update local state when prop changes
  useEffect(() => {
    setLocalUserData(userData)
  }, [userData])

  // Refresh user data when questions are used
  useEffect(() => {
    const handleQuestionsUsed = async () => {
      if (user) {
        try {
          const data = await getUser(user.id)
          setLocalUserData(data)
        } catch (error) {
          console.error('Error refreshing user data:', error)
        }
      }
    }

    window.addEventListener('questionsUsed', handleQuestionsUsed)
    return () => window.removeEventListener('questionsUsed', handleQuestionsUsed)
  }, [user])

  if (!user) {
    return null
  }

  if (!localUserData) {
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="h-2 w-16 bg-muted rounded animate-pulse"></div>
        <span className="text-xs font-medium text-muted-foreground">
          Loading...
        </span>
      </div>
    )
  }

  const questionLimit = getQuestionLimit(localUserData.tier)
  const questionsUsed = questionLimit - localUserData.questionsLeft
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
             <span className="text-xs font-medium text-muted-foreground flex items-center">
               {questionsUsed}/{localUserData?.tier === 'pro+' ? <><span className="text-lg">∞</span> <span className="ml-1">questions used</span></> : `${questionLimit} questions used`}
             </span>
           </div>
         </TooltipTrigger>
          <TooltipContent className="border border-accent/50 bg-background shadow-lg text-foreground" sideOffset={5}>
           <p className="text-sm text-foreground">
             {questionsUsed} questions used
             <br />
             <span className="text-xs text-muted-foreground">
               {localUserData.tier === 'free' ? 'Free plan' : 
                localUserData.tier === 'basic' ? 'Basic plan' : 
                localUserData.tier === 'pro' ? 'Pro plan' : 'Pro+ plan'}
             </span>
           </p>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
  )
}
