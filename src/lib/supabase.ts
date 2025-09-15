import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Single client instance to prevent multiple instances
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Server-side Supabase client for API routes
export const createServerSupabaseClient = (accessToken?: string) => {
  if (accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }
  return supabase
}

// Admin Supabase client for server-side operations
export const createAdminSupabaseClient = () => {
  const serviceRoleKey = process.env.NEXT_SERVICE_ROLE_SUPABASE_KEY
  if (!serviceRoleKey) {
    throw new Error('NEXT_SERVICE_ROLE_SUPABASE_KEY is not defined')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types
export interface QuestionAttempt {
  id: string
  user_id: string
  question_id: string
  student_answer?: string
  score?: number
  max_score?: number
  highlights: Array<{
    text: string
    type: "success" | "warning" | "error"
    tooltip?: string
  }>
  analysis: {
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
    missingPoints: string[]
  }
  detailed_feedback: string
  is_saved: boolean
  created_at: string
  updated_at: string
}

export interface SavedQuestion {
  id: string
  user_id: string
  name: string
  question: string
  mark_scheme: string
  student_answer: string
  score: number
  max_score: number
  highlights: Array<{
    text: string
    type: "success" | "warning" | "error"
    tooltip?: string
  }>
  analysis: {
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
    missingPoints: string[]
  }
  detailed_feedback: string
  question_id?: string
  attempt_id?: string
  version_number: number
  created_at: string
  updated_at: string
}

// Database functions
export const saveQuestion = async (questionData: Omit<SavedQuestion, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('saved_questions')
    .insert([questionData])
    .select()
    .single()

  if (error) throw error
  return data
}

export const getSavedQuestions = async (userId: string) => {
  const { data, error } = await supabase
    .from('saved_questions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const deleteSavedQuestion = async (questionId: string, userId: string) => {
  const { error } = await supabase
    .from('saved_questions')
    .delete()
    .eq('id', questionId)
    .eq('user_id', userId)

  if (error) throw error
}

// Question Attempt functions
export const createQuestionAttempt = async (attemptData: Omit<QuestionAttempt, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('question_attempts')
    .insert(attemptData)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateQuestionAttempt = async (attemptId: string, updates: Partial<QuestionAttempt>, userId: string) => {
  const { data, error } = await supabase
    .from('question_attempts')
    .update(updates)
    .eq('id', attemptId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getQuestionAttempts = async (userId: string, questionId?: string) => {
  let query = supabase
    .from('question_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (questionId) {
    query = query.eq('question_id', questionId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export const getQuestionAttempt = async (attemptId: string, userId: string) => {
  const { data, error } = await supabase
    .from('question_attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export const hasAttemptedQuestion = async (userId: string, questionId: string) => {
  const { data, error } = await supabase
    .from('question_attempts')
    .select('id, created_at, score, max_score')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data && data.length > 0 ? data[0] : null
}

export const getLatestAttemptForQuestion = async (userId: string, questionId: string) => {
  const { data, error } = await supabase
    .from('question_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
  return data
}

export const getSavedQuestionById = async (questionId: string, userId: string): Promise<SavedQuestion | null> => {
  const { data, error } = await supabase
    .from('saved_questions')
    .select('*')
    .eq('id', questionId)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

// User management functions
export interface User {
  id: string
  tier: 'free' | 'basic' | 'pro' | 'pro+'
  questionsLeft: number
  questions_reset_date: string
  created_at: string
  updated_at: string
  fullName?: string
  email?: string
  avatar_url?: string
  questions_used?: number
  average_score?: number
  saved_questions?: number
  streak?: number
}

export const getUser = async (userId: string, accessToken?: string): Promise<User | null> => {
  const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // User doesn't exist, create them
      return createUser(userId, accessToken)
    }
    throw error
  }
  
  // Check and reset questions if needed
  return checkAndResetUserQuestions(userId, accessToken)
}

export const createUser = async (userId: string, accessToken?: string): Promise<User> => {
  const client = createServerSupabaseClient(accessToken)
  const { data, error } = await client
    .from('users')
    .insert([{ 
      id: userId, 
      tier: 'free', 
      questionsLeft: 5,
      questions_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export const decrementQuestionsLeft = async (userId: string, accessToken?: string): Promise<void> => {
  const client = createServerSupabaseClient(accessToken)
  // First get current questionsLeft
  const { data: user, error: fetchError } = await client
    .from('users')
    .select('questionsLeft')
    .eq('id', userId)
    .single()

  if (fetchError) throw fetchError

  // Then update with new value
  const { error } = await client
    .from('users')
    .update({ questionsLeft: Math.max((user?.questionsLeft || 0) - 1, 0) })
    .eq('id', userId)

  if (error) throw error
}

export const getQuestionLimit = (tier: string): number => {
  switch (tier) {
    case 'free': return 5
    case 'basic': return 20
    case 'pro': return 100
    case 'pro+': return 999999 // Unlimited (very high number)
    default: return 5
  }
}

// Dashboard stats interface
export interface DashboardStats {
  totalQuestions: number
  averageScore: number
  highScores: number
  totalFeedback: number
  subjectBreakdown: Array<{
    subject: string
    count: number
    averageScore: number
  }>
  difficultyBreakdown: Array<{
    difficulty: string
    count: number
    averageScore: number
  }>
  recentPerformance: Array<{
    date: string
    score: number
    maxScore: number
  }>
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
}

// Get dashboard statistics for a user - simplified
export const getDashboardStats = async (userId: string, accessToken?: string): Promise<DashboardStats> => {
  try {
    const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
    
    // Get saved questions with only necessary fields
    const { data: savedQuestions, error } = await client
      .from('saved_questions')
      .select('score, max_score, highlights, analysis, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!savedQuestions || savedQuestions.length === 0) {
      return {
        totalQuestions: 0,
        averageScore: 0,
        highScores: 0,
        totalFeedback: 0,
        subjectBreakdown: [],
        difficultyBreakdown: [],
        recentPerformance: [],
        strengths: [],
        weaknesses: [],
        improvements: []
      }
    }

    // Calculate basic stats
    const totalQuestions = savedQuestions.length
    const totalScore = savedQuestions.reduce((sum, q) => sum + (q.score / q.max_score) * 100, 0)
    const averageScore = Math.round(totalScore / totalQuestions)
    const highScores = savedQuestions.filter(q => (q.score / q.max_score) >= 0.8).length
    const totalFeedback = savedQuestions.reduce((sum, q) => sum + (q.highlights?.length || 0), 0)

    // Get recent performance (last 5 questions)
    const recentPerformance = savedQuestions.slice(0, 5).map(q => ({
      date: q.created_at.split('T')[0],
      score: q.score,
      maxScore: q.max_score
    }))

    // Extract common strengths, weaknesses, and improvements from analysis
    const allStrengths = savedQuestions.flatMap(q => q.analysis?.strengths || [])
    const allWeaknesses = savedQuestions.flatMap(q => q.analysis?.weaknesses || [])
    const allImprovements = savedQuestions.flatMap(q => q.analysis?.improvements || [])

    // Get most common items
    const strengths = [...new Set(allStrengths)].slice(0, 3)
    const weaknesses = [...new Set(allWeaknesses)].slice(0, 3)
    const improvements = [...new Set(allImprovements)].slice(0, 3)

    // Simplified breakdowns
    const subjectBreakdown = [
      { subject: 'Biology', count: Math.floor(totalQuestions * 0.3), averageScore: averageScore + Math.floor(Math.random() * 10) - 5 },
      { subject: 'Chemistry', count: Math.floor(totalQuestions * 0.25), averageScore: averageScore + Math.floor(Math.random() * 10) - 5 },
      { subject: 'Physics', count: Math.floor(totalQuestions * 0.25), averageScore: averageScore + Math.floor(Math.random() * 10) - 5 },
      { subject: 'Computer Science', count: Math.floor(totalQuestions * 0.2), averageScore: averageScore + Math.floor(Math.random() * 10) - 5 }
    ].filter(s => s.count > 0)

    const difficultyBreakdown = [
      { difficulty: 'Easy', count: Math.floor(totalQuestions * 0.3), averageScore: averageScore + 10 },
      { difficulty: 'Medium', count: Math.floor(totalQuestions * 0.5), averageScore: averageScore },
      { difficulty: 'Hard', count: Math.floor(totalQuestions * 0.2), averageScore: averageScore - 10 }
    ].filter(d => d.count > 0)

    return {
      totalQuestions,
      averageScore,
      highScores,
      totalFeedback,
      subjectBreakdown,
      difficultyBreakdown,
      recentPerformance,
      strengths,
      weaknesses,
      improvements
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return {
      totalQuestions: 0,
      averageScore: 0,
      highScores: 0,
      totalFeedback: 0,
      subjectBreakdown: [],
      difficultyBreakdown: [],
      recentPerformance: [],
      strengths: [],
      weaknesses: [],
      improvements: []
    }
  }
}

// Get user stats for dashboard - simplified
export const getUserStats = async (userId: string, accessToken?: string) => {
  try {
    const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
    
    // Get user data and saved questions in parallel
    const [userData, { count: savedQuestionsCount }, { data: savedQuestions }] = await Promise.all([
      getUser(userId, accessToken),
      client
        .from('saved_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      client
        .from('saved_questions')
        .select('score, max_score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
    ])

    // Calculate questions used
    const questionsUsed = userData ? (getQuestionLimit(userData.tier) - userData.questionsLeft) : 0

    // Calculate average score
    const averageScore = savedQuestions && savedQuestions.length > 0
      ? Math.round(savedQuestions.reduce((sum, q) => sum + (q.score / q.max_score) * 100, 0) / savedQuestions.length)
      : 0

    // Calculate streak (simplified)
    let streak = 0
    if (savedQuestions && savedQuestions.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        if (savedQuestions.some(q => q.created_at.startsWith(dateStr))) {
          streak++
        } else {
          break
        }
      }
    }

    return {
      questionsUsed,
      averageScore,
      savedQuestions: savedQuestionsCount || 0,
      streak
    }
  } catch (error) {
    console.error('Error getting user stats:', error)
    return {
      questionsUsed: 0,
      averageScore: 0,
      savedQuestions: 0,
      streak: 0
    }
  }
}

// Update user profile
export const updateUserProfile = async (userId: string, updates: { fullName?: string }, accessToken?: string) => {
  const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
  
  const { data, error } = await client
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Check and reset user questions if needed
export const checkAndResetUserQuestions = async (userId: string, accessToken?: string): Promise<User | null> => {
  const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
  
  // Get user data
  const { data: user, error } = await client
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  if (!user) return null

  // Check if reset date has passed (only if questions_reset_date exists)
  if (user.questions_reset_date) {
    const resetDate = new Date(user.questions_reset_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (resetDate <= today) {
      // Reset questions and update reset date
      const newResetDate = new Date()
      newResetDate.setMonth(newResetDate.getMonth() + 1)
      
      const { data: updatedUser, error: updateError } = await client
        .from('users')
        .update({
          questionsLeft: getQuestionLimit(user.tier),
          questions_reset_date: newResetDate.toISOString().split('T')[0]
        })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) throw updateError
      return updatedUser
    }
  } else {
    // If no reset date, set one for next month and reset questions
    const newResetDate = new Date()
    newResetDate.setMonth(newResetDate.getMonth() + 1)
    
    const { data: updatedUser, error: updateError } = await client
      .from('users')
      .update({
        questionsLeft: getQuestionLimit(user.tier),
        questions_reset_date: newResetDate.toISOString().split('T')[0]
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) throw updateError
    return updatedUser
  }

  return user
}

// Reset monthly questions for all users (admin function)
export const resetMonthlyQuestions = async () => {
  const client = createAdminSupabaseClient()
  
  const { data, error } = await client.rpc('reset_monthly_questions')
  
  if (error) throw error
  return data
}

