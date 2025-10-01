"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })
      
      if (error) {
        return { error }
      }
      
      // If signup was successful, the database trigger should create the user record
      // But we'll also try to create it manually as a fallback
      if (data.user) {
        try {
          // Wait a moment for the trigger to potentially fire
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Check if user record exists, if not create it
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single()
          
          if (fetchError && fetchError.code === 'PGRST116') {
            // User doesn't exist, create them manually
            const { error: createError } = await supabase
              .from('users')
              .insert([{
                id: data.user.id,
                tier: 'free',
                questions_left: 5,
                questions_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                has_seen_welcome: false,
                full_name: name.trim()
              }])
            
            if (createError) {
              console.error('Error creating user record:', createError)
              // Don't fail the signup if user record creation fails
            }
          }
        } catch (userCreationError) {
          console.error('Error in user creation fallback:', userCreationError)
          // Don't fail the signup if user record creation fails
        }
      }
      
      return { error: null }
    } catch (error) {
      console.error('Signup error:', error)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
