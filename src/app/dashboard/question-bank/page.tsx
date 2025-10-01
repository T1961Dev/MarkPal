"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Target, Search, Filter, ArrowRight, RefreshCw, Upload, FileText, Crown } from "lucide-react"
import Link from "next/link"
import { QuestionBankCard } from "@/components/question-bank-card"
import { ExamUploadSection } from "@/components/exam-upload-section"
import { supabase, getUser, User as UserType } from "@/lib/supabase"
import { useSearchParams } from "next/navigation"

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
  paper_id?: string
  is_from_paper?: boolean
}

interface Paper {
  id: string
  title: string
  filename: string
  subject: string
  level: string
  exam_board?: string
  year?: number
  total_questions: number
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
  const { user, session } = useAuth()
  const searchParams = useSearchParams()
  const [userData, setUserData] = useState<UserType | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [papersLoading, setPapersLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    subject: '',
    topic: '',
    level: '',
    difficulty: ''
  })
  const [attemptStatuses, setAttemptStatuses] = useState<Record<string, {
    hasAttempted: boolean;
    attemptCount: number;
    latestAttempt?: {
      id: string;
      score?: number;
      max_score?: number;
      created_at: string;
    };
  }>>({})

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      window.location.href = '/'
    }
  }, [user])

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (user && session) {
        try {
          const data = await getUser(user.id, session.access_token)
          setUserData(data)
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
    }

    loadUserData()
  }, [user, session])

  // Fetch questions based on filters
  useEffect(() => {
    fetchQuestions()
  }, [filters])

  // Refresh questions when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchQuestions()
    }
  }, [user])

  // Refresh questions when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchQuestions()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  // Refresh questions when user completes a practice session
  useEffect(() => {
    const handleQuestionsUsed = () => {
      if (user) {
        fetchQuestions()
      }
    }

    window.addEventListener('questionsUsed', handleQuestionsUsed)
    return () => window.removeEventListener('questionsUsed', handleQuestionsUsed)
  }, [user])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      console.log('Fetching questions with filters:', filters)
      console.log('API URL:', `/api/questions?${params}`)
      
      const response = await fetch(`/api/questions?${params}&t=${Date.now()}`, {
        cache: 'no-store' // Always fetch fresh data
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

  const fetchPapers = async () => {
    if (!userData || userData.tier !== 'pro+') return
    
    try {
      setPapersLoading(true)
      const response = await fetch(`/api/papers?t=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await response.json()
      
      if (data.success) {
        setPapers(data.data)
      }
    } catch (error) {
      console.error('Error fetching papers:', error)
    } finally {
      setPapersLoading(false)
    }
  }

  const fetchBatchAttemptStatuses = async (questionIds: string[]) => {
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      // Create a single API call to get all attempt statuses
      const response = await fetch(`/api/question-attempts/batch-status?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({ questionIds }),
        cache: 'no-store' // Always fetch fresh attempt statuses
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAttemptStatuses(data.data)
      } else {
        console.error('Batch attempt status failed:', data.error)
        // Set default empty statuses to prevent individual API calls
        const defaultStatuses: Record<string, {
          hasAttempted: boolean;
          attemptCount: number;
        }> = {}
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

  const isProPlus = userData?.tier === 'pro+'

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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={fetchQuestions}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/practice">
                <Target className="h-4 w-4 mr-2" />
                Start Practice
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabs for Pro+ users */}
        {isProPlus ? (
          <Tabs defaultValue={searchParams.get('tab') || "questions"} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="questions" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Questions
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Papers
              </TabsTrigger>
              <TabsTrigger value="papers" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                My Papers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-6">
              {renderQuestionsContent()}
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <ExamUploadSection 
                onQuestionsExtracted={(questions, fullText, metadata) => {
                  // Handle extracted questions
                  console.log('Questions extracted:', questions)
                  // Refresh papers list after successful upload
                  fetchPapers()
                }}
                onError={(error) => {
                  console.error('Upload error:', error)
                }}
              />
            </TabsContent>

            <TabsContent value="papers" className="space-y-6">
              {renderPapersContent()}
            </TabsContent>
          </Tabs>
        ) : (
          renderQuestionsContent()
        )}
      </div>
    </DashboardLayout>
  )

  function renderQuestionsContent() {
    return (
      <>

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
      </>
    )
  }

  function renderPapersContent() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My Uploaded Papers</h2>
            <p className="text-muted-foreground mt-2">
              Papers you've uploaded and their extracted questions
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchPapers}
            disabled={papersLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${papersLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {papersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : papers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {papers.map((paper) => (
              <Card key={paper.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {paper.subject}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {paper.level}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {paper.total_questions} questions
                    </Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{paper.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {paper.filename}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {paper.exam_board && (
                      <div>Board: {paper.exam_board}</div>
                    )}
                    {paper.year && (
                      <div>Year: {paper.year}</div>
                    )}
                    <div>Uploaded: {new Date(paper.created_at).toLocaleDateString()}</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => {
                      // Navigate to paper questions
                      window.location.href = `/dashboard/question-bank?paper=${paper.id}`
                    }}
                  >
                    View Questions
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No papers uploaded yet</p>
                <p className="text-sm mt-2">Upload your first exam paper to get started</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }
}
