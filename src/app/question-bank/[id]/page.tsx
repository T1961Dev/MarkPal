'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Clock, Target, Brain, Save, Sparkles, Edit3, ArrowLeft, History, RotateCcw, Eye, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SaveQuestionDialog } from '@/components/save-question-dialog';
import { saveQuestion, createQuestionAttempt, getQuestionAttempts } from '@/lib/supabase';
import { QuestionBankLiveInput } from '@/components/question-bank-live-input';
import { AnswerHighlighter } from '@/components/answer-highlighter';
import { ProgressButton } from '@/components/progress-button';
import { MarkSchemeDialog } from '@/components/mark-scheme-dialog';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  subject: string;
  topic: string;
  level: string;
  marks: number;
  mark_scheme: string;
  question_type: string;
  difficulty: string;
  created_at: string;
}

interface QuestionAttempt {
  id: string;
  created_at: string;
  student_answer?: string;
  score?: number;
  max_score?: number;
  highlights: any[];
  analysis: any;
  detailed_feedback: string;
  is_saved: boolean;
}

export default function QuestionPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [markingResult, setMarkingResult] = useState<any>(null);
  const [isMarking, setIsMarking] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveHighlights, setLiveHighlights] = useState<any[]>([]);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [isLiveProcessing, setIsLiveProcessing] = useState(false);
  const [isSavingImproved, setIsSavingImproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previousAttempts, setPreviousAttempts] = useState<QuestionAttempt[]>([]);
  const [showPreviousAttempts, setShowPreviousAttempts] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Fetch question data and previous attempts
  useEffect(() => {
    if (params.id && user) {
      fetchQuestion();
      fetchPreviousAttempts();
    }
  }, [params.id, user]);

  // Handle fresh start and attempt parameters
  useEffect(() => {
    const fresh = searchParams.get('fresh');
    const attemptId = searchParams.get('attempt');
    
    if (fresh === 'true') {
      setStudentAnswer('');
      setMarkingResult(null);
      setLiveHighlights([]);
      setLiveScore(null);
      setIsLiveMode(false);
      setCurrentAttemptId(null);
    } else if (attemptId) {
      // Load specific attempt for improvement
      loadAttemptForImprovement(attemptId);
    }
  }, [searchParams]);

  const loadAttemptForImprovement = async (attemptId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/question-attempts/${attemptId}`);
      const data = await response.json();
      
      if (data.success) {
        const attempt = data.data;
        setStudentAnswer(attempt.student_answer || '');
        setCurrentAttemptId(attempt.id);
        // Don't load the marking result, let them improve the answer
      }
    } catch (error) {
      console.error('Error loading attempt for improvement:', error);
    }
  };

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`/api/questions/${params.id}`, {
        cache: 'force-cache',
        next: { revalidate: 3600 } // Cache for 1 hour since questions don't change often
      });
      const data = await response.json();
      
      if (data.success) {
        setQuestion(data.data);
      } else {
        console.error('Error fetching question:', data.error);
        router.push('/question-bank');
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      router.push('/question-bank');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousAttempts = async () => {
    if (!user || !params.id) return;
    
    try {
      const attempts = await getQuestionAttempts(user.id, params.id as string);
      setPreviousAttempts(attempts);
    } catch (error) {
      console.error('Error fetching previous attempts:', error);
    }
  };

  const markAnswer = async () => {
    if (!question || !studentAnswer.trim() || !user) return;

    setIsMarking(true);
    try {
      const response = await fetch('/api/mark-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question,
          studentAnswer: studentAnswer,
          markScheme: question.mark_scheme,
          maxMarks: question.marks
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMarkingResult(data.data);
        
        // Create a question attempt record
        try {
          const attempt = await createQuestionAttempt({
            user_id: user.id,
            question_id: question.id,
            student_answer: studentAnswer,
            score: data.data.score,
            max_score: data.data.maxScore,
            highlights: data.data.highlights || [],
            analysis: {
              strengths: data.data.strengths || [],
              weaknesses: [],
              improvements: data.data.improvements || [],
              missingPoints: []
            },
            detailed_feedback: data.data.feedback || '',
            is_saved: false
          });
          setCurrentAttemptId(attempt.id);
          fetchPreviousAttempts(); // Refresh the attempts list
        } catch (attemptError) {
          console.error('Error creating question attempt:', attemptError);
        }
      } else {
        console.error('Error marking answer:', data.error);
      }
    } catch (error) {
      console.error('Error marking answer:', error);
    } finally {
      setIsMarking(false);
    }
  };

  const handleSaveQuestion = async (name: string) => {
    if (!user || !question || !markingResult) return;
    
    setSavingQuestion(true);
    try {
      // Get the next version number for this question
      const existingSavedQuestions = await getQuestionAttempts(user.id, question.id);
      const versionNumber = existingSavedQuestions.length + 1;

      const savedQuestion = await saveQuestion({
        user_id: user.id,
        name,
        question: question.question,
        mark_scheme: question.mark_scheme,
        student_answer: studentAnswer,
        score: markingResult.score,
        max_score: markingResult.maxScore,
        highlights: markingResult.highlights || [],
        analysis: {
          strengths: markingResult.strengths || [],
          weaknesses: [],
          improvements: markingResult.improvements || [],
          missingPoints: []
        },
        detailed_feedback: markingResult.feedback || "",
        question_id: question.id,
        attempt_id: currentAttemptId,
        version_number: versionNumber
      });
      
      setSaveDialogOpen(false);
      
      // Mark the attempt as saved if we have a current attempt
      if (currentAttemptId) {
        try {
          await fetch('/api/question-attempts', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              attempt_id: currentAttemptId,
              is_saved: true
            }),
          });
        } catch (error) {
          console.error('Error updating attempt status:', error);
        }
      }
      
      // Show success notification with link to view the saved question
      toast.success("Question saved successfully!", {
        description: (
          <div className="flex items-center gap-2">
            <span>Your question has been saved.</span>
            <button
              onClick={() => window.open(`/dashboard/saved-questions?view=${savedQuestion.id}`, '_blank')}
              className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
            >
              Click to view the question
            </button>
          </div>
        ),
        duration: 6000,
      });
    } catch (error) {
      console.error('Error saving question:', error);
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDiscardQuestion = () => {
    setSaveDialogOpen(false);
  };

  const handleLiveAnalysis = async (text: string) => {
    if (!question || !text || !text.trim()) return;

    setIsLiveProcessing(true);
    try {
      const response = await fetch('/api/mark-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question,
          studentAnswer: text,
          markScheme: question.mark_scheme,
          maxMarks: question.marks
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setLiveHighlights(data.data.highlights || []);
        setLiveScore(data.data.score);
      }
    } catch (error) {
      console.error('Error in live analysis:', error);
    } finally {
      setIsLiveProcessing(false);
    }
  };

  const handleImproveClick = () => {
    setIsLiveMode(true);
    setMarkingResult(null);
  };

  const handleViewPreviousAttempt = (attempt: QuestionAttempt) => {
    setStudentAnswer(attempt.student_answer || '');
    setMarkingResult({
      score: attempt.score,
      maxScore: attempt.max_score,
      highlights: attempt.highlights,
      feedback: attempt.detailed_feedback,
      strengths: attempt.analysis?.strengths || [],
      improvements: attempt.analysis?.improvements || []
    });
    setCurrentAttemptId(attempt.id);
    setShowPreviousAttempts(false);
  };

  const handleStartFresh = () => {
    setStudentAnswer('');
    setMarkingResult(null);
    setLiveHighlights([]);
    setLiveScore(null);
    setIsLiveMode(false);
    setCurrentAttemptId(null);
    setShowPreviousAttempts(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

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

  const handleBackToResults = () => {
    setIsLiveMode(false);
    setLiveHighlights([]);
    setLiveScore(null);
  };

  const handleSaveImprovedAnswer = async () => {
    if (!question || !studentAnswer.trim() || !user) return;

    setIsSavingImproved(true);
    try {
      const response = await fetch('/api/mark-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question,
          studentAnswer: studentAnswer,
          markScheme: question.mark_scheme,
          maxMarks: question.marks
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMarkingResult(data.data);
        setIsLiveMode(false);
        
        // Create a question attempt record for the improved answer
        try {
          const attempt = await createQuestionAttempt({
            user_id: user.id,
            question_id: question.id,
            student_answer: studentAnswer,
            score: data.data.score,
            max_score: data.data.maxScore,
            highlights: data.data.highlights || [],
            analysis: {
              strengths: data.data.strengths || [],
              weaknesses: [],
              improvements: data.data.improvements || [],
              missingPoints: []
            },
            detailed_feedback: data.data.feedback || '',
            is_saved: false
          });
          setCurrentAttemptId(attempt.id);
          fetchPreviousAttempts(); // Refresh the attempts list
        } catch (attemptError) {
          console.error('Error creating question attempt:', attemptError);
        }
      } else {
        console.error('Error marking improved answer:', data.error);
      }
    } catch (error) {
      console.error('Error marking improved answer:', error);
    } finally {
      setIsSavingImproved(false);
    }
  };

  if (!user) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading question...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!question) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Question not found</h2>
            <p className="text-muted-foreground mb-4">The question you're looking for doesn't exist or has been removed.</p>
            <Button 
              onClick={() => router.push('/dashboard/question-bank')}
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Question Bank
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="mb-6">
          <Button 
            onClick={() => router.push('/dashboard/question-bank')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Question Bank
          </Button>
          <h1 className="text-3xl font-bold mb-2">Practice Question</h1>
          <p className="text-gray-600">Work through this question and get detailed feedback</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Question */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Question
                </CardTitle>
                <div className="flex items-center gap-2">
                  <MarkSchemeDialog 
                    questionNumber={question.id} 
                    markScheme={question.mark_scheme} 
                    maxMarks={question.marks}
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </MarkSchemeDialog>
                  <Badge className={getDifficultyColor(question.difficulty)}>
                    {question.difficulty}
                  </Badge>
                  <Badge className={getLevelColor(question.level)}>
                    {question.level}
                  </Badge>
                  <Badge variant="outline">
                    {question.marks} marks
                  </Badge>
                </div>
              </div>
              <CardDescription>
                {question.subject} • {question.topic}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{question.question}</p>
            </CardContent>
          </Card>

          {/* Previous Attempts Button */}
          {previousAttempts.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setShowPreviousAttempts(!showPreviousAttempts)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Previous Attempts ({previousAttempts.length})
                {showPreviousAttempts ? ' - Hide' : ' - Show'}
              </Button>
            </div>
          )}

          {/* Previous Attempts Popup */}
          {showPreviousAttempts && previousAttempts.length > 0 && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Previous Attempts ({previousAttempts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {previousAttempts.map((attempt, index) => (
                    <div
                      key={attempt.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                        currentAttemptId === attempt.id ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                      }`}
                      onClick={() => handleViewPreviousAttempt(attempt)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            Attempt #{previousAttempts.length - index}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(attempt.created_at)}
                          </div>
                          {attempt.score !== undefined && attempt.max_score && (
                            <Badge variant="outline" className={getScoreColor(attempt.score, attempt.max_score)}>
                              {attempt.score}/{attempt.max_score}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Click to view</span>
                        </div>
                      </div>
                      {attempt.student_answer && (
                        <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {attempt.student_answer}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartFresh}
                      className="w-full"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Fresh Attempt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Answer Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Your Answer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLiveMode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">Live Mode</span>
                      {liveScore !== null && (
                        <Badge variant="outline" className="ml-2">
                          {liveScore}/{question.marks} marks
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBackToResults}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Back to Results
                    </Button>
                  </div>
                  <QuestionBankLiveInput
                    value={studentAnswer || ''}
                    onChange={setStudentAnswer}
                    onAnalysis={handleLiveAnalysis}
                    highlights={liveHighlights}
                    isLoading={isLiveProcessing}
                    placeholder="Write your improved answer here..."
                    onSave={handleSaveImprovedAnswer}
                    isSaving={isSavingImproved}
                  />
                </div>
              ) : (
                <>
                  <Textarea
                    placeholder="Write your answer here..."
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    className="min-h-32"
                  />
                  <ProgressButton 
                    onClick={markAnswer} 
                    disabled={!studentAnswer.trim() || isMarking}
                    className="w-full"
                    duration={6000}
                    icon={<Brain className="w-4 h-4 mr-2" />}
                  >
                    Mark Answer
                  </ProgressButton>
                </>
              )}
            </CardContent>
          </Card>

          {/* Marking Results */}
          {markingResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Marking Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold">
                    {markingResult.score}/{markingResult.maxScore}
                  </div>
                  <div className="text-sm text-gray-600">
                    {Math.round((markingResult.score / markingResult.maxScore) * 100)}%
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Your Answer with Feedback:</h4>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <AnswerHighlighter 
                      answerText={studentAnswer}
                      highlights={markingResult.highlights || []}
                    />
                  </div>
                </div>

                {markingResult.strengths && markingResult.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-green-700">Strengths:</h4>
                    <ul className="text-sm space-y-1">
                      {markingResult.strengths.map((strength: string, index: number) => (
                        <li key={index} className="text-green-600">• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {markingResult.improvements && markingResult.improvements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-orange-700">Areas for Improvement:</h4>
                    <ul className="text-sm space-y-1">
                      {markingResult.improvements.map((improvement: string, index: number) => (
                        <li key={index} className="text-orange-600">• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t space-y-2">
                  <Button 
                    onClick={handleImproveClick}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Improve My Answer
                  </Button>
                  <Button 
                    onClick={() => setSaveDialogOpen(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save This Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save Question Dialog */}
      <SaveQuestionDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveQuestion}
        onDiscard={handleDiscardQuestion}
        isLoading={savingQuestion}
      />
    </DashboardLayout>
  );
}
