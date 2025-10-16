"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, PenTool, Target } from "lucide-react";

interface InputFormProps {
  onSubmit: (data: {
    question: string;
    markScheme: string;
    studentAnswer: string;
    maxMarks: number;
  }) => void;
  isLoading?: boolean;
}

export function InputForm({ onSubmit, isLoading = false }: InputFormProps) {
  const [question, setQuestion] = useState("");
  const [markScheme, setMarkScheme] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [maxMarks, setMaxMarks] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      question,
      markScheme,
      studentAnswer,
      maxMarks: parseInt(maxMarks) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question and Mark Scheme Card */}
      <Card className="card-shadow rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Question & Mark Scheme
              </CardTitle>
              <CardDescription className="text-gray-600">
                Paste the exam question and official mark scheme
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question" className="text-sm font-medium text-gray-700">
              Question
            </Label>
            <Textarea
              id="question"
              placeholder="Paste the exam question here..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px] resize-none rounded-xl border-gray-200 bg-white/50 focus:border-blue-300 focus:ring-blue-200"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="markScheme" className="text-sm font-medium text-gray-700">
              Mark Scheme
            </Label>
            <Textarea
              id="markScheme"
              placeholder="Paste the official mark scheme here..."
              value={markScheme}
              onChange={(e) => setMarkScheme(e.target.value)}
              className="min-h-[120px] resize-none rounded-xl border-gray-200 bg-white/50 font-mono text-sm focus:border-blue-300 focus:ring-blue-200"
              required
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="maxMarks" className="text-sm font-medium text-gray-700">
                Max Marks
              </Label>
              <Input
                id="maxMarks"
                type="number"
                placeholder="e.g., 6"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="rounded-xl border-gray-200 bg-white/50 focus:border-blue-300 focus:ring-blue-200"
              />
            </div>
            <Badge variant="secondary" className="rounded-lg bg-blue-50 text-blue-700">
              Optional
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Student Answer Card */}
      <Card className="card-shadow rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <PenTool className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Your Answer
              </CardTitle>
              <CardDescription className="text-gray-600">
                Write or paste your answer for AI feedback
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="studentAnswer" className="text-sm font-medium text-gray-700">
              Answer
            </Label>
            <Textarea
              id="studentAnswer"
              placeholder="Write your answer here..."
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              className="min-h-[150px] resize-none rounded-xl border-gray-200 bg-white/50 focus:border-blue-300 focus:ring-blue-200"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={isLoading || !question || !markScheme || !studentAnswer}
          className="group relative h-12 w-full max-w-md rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 text-white shadow-lg hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Analyzing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Get AI Feedback
            </div>
          )}
        </Button>
      </div>
    </form>
  );
}
