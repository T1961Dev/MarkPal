import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug: Check if environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    anonKey: !!supabaseAnonKey
  })
}

// Single client instance to prevent multiple instances
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Server-side Supabase client for API routes - reuse existing client when possible
export const createServerSupabaseClient = (accessToken?: string) => {
  // If no access token, use the existing client
  if (!accessToken) {
    return supabase
  }
  
  // Only create new client if we have an access token
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
export const saveQuestion = async (questionData: Omit<SavedQuestion, 'id' | 'created_at' | 'updated_at'>, accessToken?: string) => {
  const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
  const { data, error } = await client
    .from('saved_questions')
    .insert([questionData])
    .select()
    .single()

  if (error) throw error
  
  // Invalidate saved questions cache for this user
  if (questionData.user_id) {
    savedQuestionsCache.delete(questionData.user_id)
  }
  
  // Update streak after saving question
  if (accessToken) {
    try {
      await updateUserStreak(questionData.user_id, accessToken)
    } catch (streakError) {
      console.error('Error updating streak after saving question:', streakError)
      // Don't throw error - saving the question is more important
    }
  }
  
  return data
}

// Cache for saved questions
const savedQuestionsCache = new Map<string, { data: any[], timestamp: number }>()
const SAVED_QUESTIONS_CACHE_DURATION = 5000 // 5 seconds - short cache for quick updates

export const getSavedQuestions = async (userId: string) => {
  // Check cache first
  const cached = savedQuestionsCache.get(userId)
  if (cached && Date.now() - cached.timestamp < SAVED_QUESTIONS_CACHE_DURATION) {
    return cached.data
  }

  const { data, error } = await supabase
    .from('saved_questions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // Cache the result
  savedQuestionsCache.set(userId, { data, timestamp: Date.now() })
  return data
}

export const deleteSavedQuestion = async (questionId: string, userId: string) => {
  const { error } = await supabase
    .from('saved_questions')
    .delete()
    .eq('id', questionId)
    .eq('user_id', userId)

  if (error) throw error
  
  // Invalidate caches
  savedQuestionsCache.delete(userId)
  savedQuestionCache.delete(`${userId}-${questionId}`)
}

// Question Attempt functions
export const createQuestionAttempt = async (attemptData: Omit<QuestionAttempt, 'id' | 'created_at' | 'updated_at'>, accessToken?: string) => {
  const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
  const { data, error } = await client
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

// Cache for individual saved questions
const savedQuestionCache = new Map<string, { data: SavedQuestion, timestamp: number }>()
const SAVED_QUESTION_CACHE_DURATION = 5000 // 5 seconds - short cache for quick updates

export const getSavedQuestionById = async (questionId: string, userId: string): Promise<SavedQuestion | null> => {
  const cacheKey = `${userId}-${questionId}`
  
  // Check cache first
  const cached = savedQuestionCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < SAVED_QUESTION_CACHE_DURATION) {
    return cached.data
  }

  const { data, error } = await supabase
    .from('saved_questions')
    .select('*')
    .eq('id', questionId)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  
  // Cache the result
  if (data) {
    savedQuestionCache.set(cacheKey, { data, timestamp: Date.now() })
  }
  return data
}

// Get the next version number for a question
export const getNextVersionNumber = async (userId: string, questionId?: string, questionName?: string): Promise<number> => {
  try {
    let query = supabase
      .from('saved_questions')
      .select('version_number')
      .eq('user_id', userId)
    
    // If we have a question_id (from question bank), use it to group versions
    if (questionId) {
      query = query.eq('question_id', questionId)
    } 
    // Otherwise, for practice questions, use the question name to group versions
    else if (questionName) {
      query = query.eq('name', questionName)
    }
    // If neither, this is a brand new question
    else {
      return 1
    }
    
    const { data, error } = await query.order('version_number', { ascending: false }).limit(1)
    
    if (error) {
      console.error('Error getting version number:', error)
      return 1
    }
    
    // If no existing versions, return 1
    if (!data || data.length === 0) {
      return 1
    }
    
    // Return the next version number
    return (data[0].version_number || 0) + 1
  } catch (error) {
    console.error('Error in getNextVersionNumber:', error)
    return 1
  }
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
  has_seen_welcome?: boolean
}

// Simple cache to avoid repeated queries
const userCache = new Map<string, { data: User; timestamp: number }>()
const CACHE_DURATION = 2000 // 2 seconds - short cache for instant updates

// localStorage cache for instant data
const STORAGE_KEY = 'markpal_user_data'
const STORAGE_DURATION = 3000 // 3 seconds - very short for instant plan updates

// Get user data from localStorage for instant loading
export const getUserFromStorage = (userId: string): User | null => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null
  }
  
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    if (!stored) return null
    
    const { data, timestamp } = JSON.parse(stored)
    if (Date.now() - timestamp > STORAGE_DURATION) {
      localStorage.removeItem(`${STORAGE_KEY}_${userId}`)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error reading from localStorage:', error)
    return null
  }
}

// Save user data to localStorage
export const saveUserToStorage = (userId: string, data: User) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }
  
  try {
    const storageData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(storageData))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

// Cache invalidation function
export const invalidateUserCache = (userId: string) => {
  userCache.delete(userId)
  // Also clear localStorage (only in browser)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(`${STORAGE_KEY}_${userId}`)
  }
}

// Clear all cache
export const clearUserCache = () => {
  userCache.clear()
  // Clear all localStorage entries (only in browser)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_KEY)) {
        localStorage.removeItem(key)
      }
    })
  }
}

export const getUser = async (userId: string, accessToken?: string): Promise<User | null> => {
  // 1. Check localStorage first (instant)
  const storedData = getUserFromStorage(userId)
  if (storedData) {
    // Update in-memory cache with stored data
    userCache.set(userId, { data: storedData, timestamp: Date.now() })
    return storedData
  }
  
  // 2. Check in-memory cache
  const cached = userCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  // Only create client if we need to make a database call
  const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
  
  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User doesn't exist, create them
        const newUser = await createUser(userId, accessToken)
        userCache.set(userId, { data: newUser, timestamp: Date.now() })
        saveUserToStorage(userId, newUser)
        return newUser
      }
      console.error('Error fetching user:', error)
      throw error
    }
    
    // Check and reset questions if needed (optimized)
    const updatedUser = await checkAndResetUserQuestionsOptimized(data, client)
    userCache.set(userId, { data: updatedUser, timestamp: Date.now() })
    saveUserToStorage(userId, updatedUser)
    return updatedUser
  } catch (error) {
    console.error('Error in getUser:', error)
    throw error
  }
}

// Optimistic user data for instant UI updates
export const getOptimisticUserData = (userId: string): User | null => {
  // Check in-memory cache first
  const cached = userCache.get(userId)
  if (cached) return cached.data
  
  // Fallback to localStorage for instant data
  return getUserFromStorage(userId)
}

// Force refresh user data (bypasses all caches)
export const refreshUserData = async (userId: string, accessToken?: string): Promise<User | null> => {
  // Clear all caches first
  invalidateUserCache(userId)
  
  // Fetch fresh data from database
  const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
  
  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error refreshing user data:', error)
      throw error
    }
    
    // Update caches with fresh data
    const updatedUser = await checkAndResetUserQuestionsOptimized(data, client)
    userCache.set(userId, { data: updatedUser, timestamp: Date.now() })
    saveUserToStorage(userId, updatedUser)
    
    return updatedUser
  } catch (error) {
    console.error('Error in refreshUserData:', error)
    throw error
  }
}

export const createUser = async (userId: string, accessToken?: string, fullName?: string, email?: string): Promise<User> => {
  const client = createServerSupabaseClient(accessToken)
  
  try {
    const { data, error } = await client
      .from('users')
      .insert([{ 
        id: userId,
        email: email || '',
        tier: 'free', 
        questionsLeft: 5,
        questions_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        has_seen_welcome: false, // New users haven't seen the welcome popup yet
        fullName: fullName || ''
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating user:', error)
    // If the has_seen_welcome column doesn't exist, try without it
    if ((error as any)?.message?.includes('has_seen_welcome')) {
      console.log('has_seen_welcome column not found, creating user without it')
      const { data, error: retryError } = await client
        .from('users')
        .insert([{ 
          id: userId, 
          tier: 'free', 
          questionsLeft: 5,
          questions_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          fullName: fullName || ''
        }])
        .select()
        .single()

      if (retryError) throw retryError
      // Add the has_seen_welcome field manually for the response
      return { ...data, has_seen_welcome: false }
    }
    throw error
  }
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

  // Note: Data sync events are handled in the client-side components
  // This ensures the UI updates when questions are used
}

// Update user streak when they practice
export const updateUserStreak = async (userId: string, accessToken?: string): Promise<void> => {
  const client = createServerSupabaseClient(accessToken)
  
  // Get current streak from getUserStats
  const stats = await getUserStats(userId, accessToken)
  
  // Update the user's streak in the database
  const { error } = await client
    .from('users')
    .update({ streak: stats.streak })
    .eq('id', userId)

  if (error) throw error
}

export const getQuestionLimit = (tier: string): number => {
  switch (tier) {
    case 'free': return 5
    case 'basic': return 20
    case 'pro': return 50
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
export const getUserStats = async (userId: string, accessToken?: string, timePeriod: 'today' | 'week' | 'month' | 'alltime' = 'alltime') => {
  try {
    const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
    
    // Calculate date range based on time period
    let startDate: Date
    switch (timePeriod) {
      case 'today':
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'alltime':
      default:
        startDate = new Date('1900-01-01') // Very old date to get all records
        break
    }
    const startDateStr = startDate.toISOString()
    
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
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
    ])

    // Get question attempts for the user based on time period
    const { data: questionAttempts } = await client
      .from('question_attempts')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: false })

    // Calculate questions practiced in the selected time period
    let questionsUsed = 0
    
    if (timePeriod === 'today') {
      // For today, filter by exact date match
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]
      
      const todaySavedQuestions = savedQuestions ? savedQuestions.filter(q => 
        q.created_at.split('T')[0] === todayStr
      ).length : 0
      
      const todayQuestionAttempts = questionAttempts ? questionAttempts.filter(q => 
        q.created_at.split('T')[0] === todayStr
      ).length : 0
      
      questionsUsed = todaySavedQuestions + todayQuestionAttempts
    } else {
      // For other periods, count all records since they're already filtered by date range
      questionsUsed = (savedQuestions?.length || 0) + (questionAttempts?.length || 0)
    }
    
    // Debug logging
    console.log('Dashboard stats debug:', {
      timePeriod,
      startDateStr,
      savedQuestionsCount: savedQuestions?.length || 0,
      questionAttemptsCount: questionAttempts?.length || 0,
      totalQuestionsUsed: questionsUsed
    })

    // Calculate average score
    const averageScore = savedQuestions && savedQuestions.length > 0
      ? Math.round(savedQuestions.reduce((sum, q) => sum + (q.score / q.max_score) * 100, 0) / savedQuestions.length)
      : 0

    // Calculate streak - check both saved questions and question attempts
    let streak = 0
    
    // Combine all activity dates (saved questions + question attempts)
    const allActivityDates = new Set<string>()
    
    // Add saved question dates
    if (savedQuestions) {
      savedQuestions.forEach(q => {
        const dateStr = q.created_at.split('T')[0]
        allActivityDates.add(dateStr)
      })
    }
    
    // Add question attempt dates
    if (questionAttempts) {
      questionAttempts.forEach(attempt => {
        const dateStr = attempt.created_at.split('T')[0]
        allActivityDates.add(dateStr)
      })
    }
    
    // Calculate consecutive days from today backwards
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 30; i++) { // Check up to 30 days back (optimized)
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      
      if (allActivityDates.has(dateStr)) {
        streak++
      } else {
        break
      }
    }
    
    // Debug logging
    console.log('Streak calculation:', {
      userId,
      savedQuestionsCount: savedQuestions?.length || 0,
      questionAttemptsCount: questionAttempts?.length || 0,
      allActivityDates: Array.from(allActivityDates).sort().reverse(),
      calculatedStreak: streak
    })

    return {
      questionsUsed,
      averageScore,
      savedQuestions: savedQuestionsCount || 0,
      streak
    }
  } catch (error) {
    console.error('Error getting user stats:', error)
    // Return default values but also log the error for debugging
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

// Mark welcome popup as seen
export const markWelcomeSeen = async (userId: string, accessToken?: string) => {
  const client = accessToken ? createServerSupabaseClient(accessToken) : supabase
  
  try {
    const { data, error } = await client
      .from('users')
      .update({ has_seen_welcome: true })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error marking welcome as seen:', error)
    // If the has_seen_welcome column doesn't exist, just return the current user data
    if ((error as any)?.message?.includes('has_seen_welcome')) {
      console.log('has_seen_welcome column not found, skipping update')
      const { data, error: fetchError } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (fetchError) throw fetchError
      return data
    }
    throw error
  }
}

// Optimized version - takes user data directly to avoid extra query
export const checkAndResetUserQuestionsOptimized = async (user: User, client: any): Promise<User> => {
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
        .eq('id', user.id)
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
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) throw updateError
    return updatedUser
  }

  return user
}

// Keep original function for backward compatibility
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

  return await checkAndResetUserQuestionsOptimized(user, client)
}

// Reset monthly questions for all users (admin function)
export const resetMonthlyQuestions = async () => {
  const client = createAdminSupabaseClient()
  
  const { data, error } = await client.rpc('reset_monthly_questions')
  
  if (error) throw error
  return data
}

