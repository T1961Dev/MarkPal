'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Clock,
  Target,
  Brain,
  Save,
  Sparkles,
  Edit3,
  ArrowLeft,
  History,
  RotateCcw,
  Eye,
  FileText,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SaveQuestionDialog } from '@/components/save-question-dialog';
import {
  saveQuestion,
  createQuestionAttempt,
  getQuestionAttempts,
  getUser,
  User,
  getNextVersionNumber,
} from '@/lib/supabase';
import { QuestionBankLiveInput } from '@/components/question-bank-live-input';
import { AnswerHighlighter } from '@/components/answer-highlighter';
import { ProgressButton } from '@/components/progress-button';
import { MarkSchemeDialog } from '@/components/mark-scheme-dialog';
import { PricingPopup } from '@/components/pricing-popup';
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
  highlights: Array<{
    text: string;
    type: 'success' | 'warning' | 'error';
    tooltip?: string;
  }>;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    missingPoints: string[];
  };
  detailed_feedback: string;
  is_saved: boolean;
}

function QuestionPageContent() {
  const { user, session } = useAuth();
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
  const [pricingPopupOpen, setPricingPopupOpen] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push('/');
  }, [user, router]);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (user && session) {
        try {
          const data = await getUser(user.id, session.access_token);
          setUserData(data);
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };
    loadUserData();
  }, [user, session]);

  // Fetch question and attempts
  useEffect(() => {
    if (params.id && user) {
      fetchQuestion();
      fetchPreviousAttempts();
    }
  }, [params.id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle query params
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
      loadAttemptForImprovement(attemptId);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAttemptForImprovement = async (attemptId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/question-attempts/${attemptId}`);
      const data = await res.json();
      if (data.success) {
        const attempt = data.data;
        setStudentAnswer(attempt.student_answer || '');
        setCurrentAttemptId(attempt.id);
      }
    } catch (error) {
      console.error('Error loading attempt for improvement:', error);
    }
  };

  const fetchQuestion = async () => {
    try {
      const res = await fetch(`/api/questions/${params.id}`, {
        cache: 'force-cache',
        next: { revalidate: 3600 },
      });
      const data = await res.json();
      if (data.success) {
        setQuestion(data.data);
      } else {
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

    if (userData && userData.questionsLeft <= 0) {
      setPricingPopupOpen(true);
      toast.error('No questions remaining. Upgrade to continue.');
      return;
    }

    setIsMarking(true);
    try {
      const res = await fetch('/api/mark-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          studentAnswer,
          markScheme: question.mark_scheme,
          maxMarks: question.marks,
          userId: user.id,
          accessToken: session?.access_token,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMarkingResult(data.data);
        window.dispatchEvent(new Event('questionsUsed'));
        const updatedUserData = await getUser(user.id, session?.access_token || '');
        setUserData(updatedUserData);

        const attempt = await createQuestionAttempt(
          {
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
              missingPoints: [],
            },
            detailed_feedback: data.data.feedback || '',
            is_saved: false,
          },
          session?.access_token
        );
        setCurrentAttemptId(attempt.id);
        fetchPreviousAttempts();
      } else {
        toast.error('Failed to mark answer.');
      }
    } catch (error) {
      console.error('Error marking answer:', error);
    } finally {
      setIsMarking(false);
    }
  };

  const handleImproveClick = () => {
    setIsLiveMode(true);
    setMarkingResult(null);
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getScoreColor = (score: number, maxScore: number) => {
    const p = (score / maxScore) * 100;
    if (p >= 80) return 'text-green-600';
    if (p >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16 text-muted-foreground">Loading question...</div>
      </DashboardLayout>
    );

  if (!question)
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16 text-muted-foreground">Question not found</div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Button onClick={() => router.push('/dashboard/question-bank')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Previous Attempts */}
        {previousAttempts.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowPreviousAttempts(!showPreviousAttempts)}
            >
              <History className="h-4 w-4 mr-2" />
              Previous Attempts ({previousAttempts.length})
            </Button>
          </div>
        )}

        {showPreviousAttempts && previousAttempts.length > 0 && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Previous Attempts ({previousAttempts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previousAttempts.map((a, i) => (
                <div
                  key={a.id}
                  className="p-3 border rounded-md cursor-pointer hover:bg-accent/50"
                  onClick={() => setStudentAnswer(a.student_answer || '')}
                >
                  <div className="flex justify-between">
                    <span>
                      Attempt #{previousAttempts.length - i} • {formatDate(a.created_at)}
                    </span>
                    {a.score !== undefined && a.max_score && (
                      <Badge variant="outline" className={getScoreColor(a.score, a.max_score)}>
                        {a.score}/{a.max_score}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <Button onClick={handleStartFresh} variant="outline" size="sm" className="mt-3 w-full">
                <RotateCcw className="h-4 w-4 mr-2" /> Start Fresh
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Question + Answer */}
        <Card>
          <CardHeader>
            <CardTitle>{question.question}</CardTitle>
            <CardDescription>
              {question.subject} • {question.topic}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write your answer..."
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
            />
            <ProgressButton
              onClick={markAnswer}
              disabled={!studentAnswer.trim() || isMarking}
              isLoading={isMarking}
              className="w-full mt-4"
              icon={<Brain className="h-4 w-4 mr-2" />}
            >
              Mark Answer
            </ProgressButton>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function QuestionPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex justify-center py-16 text-muted-foreground">Loading...</div>
        </DashboardLayout>
      }
    >
      <QuestionPageContent />
    </Suspense>
  );
}
