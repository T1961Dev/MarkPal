"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookOpen, Target, Search, Filter, ArrowRight } from "lucide-react"
import Link from "next/link"
import { QuestionBankCard } from "@/components/question-bank-card"
import { supabase } from "@/lib/supabase"

interface Question {
  id: string
  question: string
  subject: string
  topic: string
  level: string
  marks: number
  mark_scheme: string
  question_type: string
  difficulty: string
  created_at: string
}

const subjects = [
  { value: 'biology', label: 'Biology' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'physics', label: 'Physics' },
  { value: 'computer-science', label: 'Computer Science' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
  { value: 'other', label: 'Other' }
]

const levels = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'higher', label: 'Higher' },
  { value: 'mixed', label: 'Mixed' }
]

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
]

export default function QuestionBank() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    subject: '',
    topic: '',
    level: '',
    difficulty: ''
  })
  const [attemptStatuses, setAttemptStatuses] = useState<Record<string, any>>({})

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      window.location.href = '/'
    }
  }, [user])

  // Fetch questions based on filters
  useEffect(() => {
    fetchQuestions()
  }, [filters])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      console.log('Fetching questions with filters:', filters)
      console.log('API URL:', `/api/questions?${params}`)
      
      const response = await fetch(`/api/questions?${params}`, {
        cache: 'force-cache',
        next: { revalidate: 300 } // Cache for 5 minutes
      })
      const data = await response.json()
      
      console.log('API Response:', data)
      
      if (data.success) {
        setQuestions(data.data)
        console.log('Questions set:', data.data.length, 'questions')
        
        // Batch load attempt statuses for all questions
        if (user && data.data.length > 0) {
          fetchBatchAttemptStatuses(data.data.map((q: Question) => q.id))
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBatchAttemptStatuses = async (questionIds: string[]) => {
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      // Create a single API call to get all attempt statuses
      const response = await fetch('/api/question-attempts/batch-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({ questionIds }),
        cache: 'force-cache',
        next: { revalidate: 60 }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAttemptStatuses(data.data)
      } else {
        console.error('Batch attempt status failed:', data.error)
        // Set default empty statuses to prevent individual API calls
        const defaultStatuses: Record<string, any> = {}
        questionIds.forEach(id => {
          defaultStatuses[id] = { hasAttempted: false, attemptCount: 0 }
        })
        setAttemptStatuses(defaultStatuses)
      }
    } catch (error) {
      console.error('Error fetching batch attempt statuses:', error)
      // Set default empty statuses to prevent individual API calls
      const defaultStatuses: Record<string, any> = {}
      questionIds.forEach(id => {
        defaultStatuses[id] = { hasAttempted: false, attemptCount: 0 }
      })
      setAttemptStatuses(defaultStatuses)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'foundation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'higher': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'mixed': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const filteredQuestions = questions.filter(question =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.topic.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user) {
    return null // Will redirect
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Question Bank</h1>
            <p className="text-muted-foreground mt-2">
              Practice with GCSE questions and get instant feedback
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/practice">
              <Target className="h-4 w-4 mr-2" />
              Start Practice
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Select value={filters.subject} onValueChange={(value) => setFilters({...filters, subject: value === "all" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All subjects</SelectItem>
                      {subjects.map(subject => (
                        <SelectItem key={subject.value} value={subject.value}>
                          {subject.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Level</label>
                  <Select value={filters.level} onValueChange={(value) => setFilters({...filters, level: value === "all" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      {levels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select value={filters.difficulty} onValueChange={(value) => setFilters({...filters, difficulty: value === "all" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All difficulties</SelectItem>
                      {difficulties.map(difficulty => (
                        <SelectItem key={difficulty.value} value={difficulty.value}>
                          {difficulty.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions Grid */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredQuestions.length} questions found
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-5 bg-muted rounded w-16"></div>
                          <div className="h-5 bg-muted rounded w-20"></div>
                        </div>
                        <div className="h-5 bg-muted rounded w-12"></div>
                      </div>
                      <div className="h-3 bg-muted rounded w-32"></div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                        <div className="h-3 bg-muted rounded w-4/6"></div>
                        <div className="h-3 bg-muted rounded w-3/6"></div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-muted rounded w-24"></div>
                          <div className="h-4 bg-muted rounded w-4"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredQuestions.map((question) => (
                  <Link key={question.id} href={`/question-bank/${question.id}`} prefetch={true}>
                    <QuestionBankCard 
                      question={question}
                      getDifficultyColor={getDifficultyColor}
                      getLevelColor={getLevelColor}
                      attemptStatus={attemptStatuses[question.id]}
                    />
                  </Link>
                ))}
              </div>
            )}
            
            {!loading && filteredQuestions.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No questions found with the current filters</p>
                    <p className="text-sm mt-2">Try adjusting your filter criteria</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
