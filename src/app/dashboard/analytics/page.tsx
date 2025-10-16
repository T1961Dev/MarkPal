"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  BookOpen,
  Award,
  Clock,
  Brain,
  CheckCircle,
  AlertCircle,
  Calendar,
  Star
} from "lucide-react"
import { getDashboardStats, DashboardStats } from "@/lib/supabase"

// interface AnalyticsData {
//   totalQuestions: number
//   averageScore: number
//   highScores: number
//   totalFeedback: number
//   subjectBreakdown: Array<{
//     subject: string
//     count: number
//     averageScore: number
//   }>
//   difficultyBreakdown: Array<{
//     difficulty: string
//     count: number
//     averageScore: number
//   }>
//   recentPerformance: Array<{
//     date: string
//     score: number
//     maxScore: number
//   }>
//   strengths: string[]
//   weaknesses: string[]
//   improvements: string[]
// }

export default function Analytics() {
  const { user } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const data = await getDashboardStats(user!.id)
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  if (!user) {
    return null // Will redirect
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!analyticsData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Analytics Data</h2>
          <p className="text-muted-foreground mb-4">
            Start practicing to see your performance analytics
          </p>
          <Button asChild>
            <a href="/dashboard/practice">Start Practicing</a>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Track your progress and identify areas for improvement
            </p>
          </div>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Questions
                  </p>
                  <p className="text-2xl font-bold">{analyticsData.totalQuestions}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Average Score
                  </p>
                  <p className="text-2xl font-bold">{analyticsData.averageScore}%</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    High Scores
                  </p>
                  <p className="text-2xl font-bold">{analyticsData.highScores}</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Feedback Points
                  </p>
                  <p className="text-2xl font-bold">{analyticsData.totalFeedback}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subject Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance by Subject
              </CardTitle>
              <CardDescription>
                Your average scores across different subjects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.subjectBreakdown.map((subject) => (
                  <div key={subject.subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{subject.subject}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={getScoreBadgeVariant(subject.averageScore)}>
                          {subject.averageScore}%
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {subject.count} questions
                        </span>
                      </div>
                    </div>
                    <Progress value={subject.averageScore} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Difficulty Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance by Difficulty
              </CardTitle>
              <CardDescription>
                How you perform on different difficulty levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.difficultyBreakdown.map((difficulty) => (
                  <div key={difficulty.difficulty} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{difficulty.difficulty}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={getScoreBadgeVariant(difficulty.averageScore)}>
                          {difficulty.averageScore}%
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {difficulty.count} questions
                        </span>
                      </div>
                    </div>
                    <Progress value={difficulty.averageScore} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Strengths
              </CardTitle>
              <CardDescription>
                Areas where you excel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-900 dark:text-green-100">
                      {strength}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Areas to Improve
              </CardTitle>
              <CardDescription>
                Focus areas for better performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.weaknesses.map((weakness, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      {weakness}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-600" />
                Recommendations
              </CardTitle>
              <CardDescription>
                Suggested next steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.improvements.map((improvement, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <Star className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      {improvement}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Performance Trend
            </CardTitle>
            <CardDescription>
              Your scores over the last 5 practice sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.recentPerformance.map((session, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {new Date(session.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Practice Session
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {session.score}/{session.maxScore}
                      </p>
                      <p className={`text-sm ${getScoreColor((session.score / session.maxScore) * 100)}`}>
                        {Math.round((session.score / session.maxScore) * 100)}%
                      </p>
                    </div>
                    <Progress 
                      value={(session.score / session.maxScore) * 100} 
                      className="w-20"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
