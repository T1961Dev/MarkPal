"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeedbackHighlighter } from "./feedback-highlighter";
import { Eye, EyeOff, Trophy, Target, MessageSquare } from "lucide-react";

interface FeedbackResult {
  score: number;
  maxMarks: number;
  feedback: string;
  highlights: Array<{
    text: string;
    type: "correct" | "partial" | "incorrect";
    suggestion?: string;
  }>;
  modelAnswer?: string;
}

interface FeedbackResultsProps {
  result: FeedbackResult;
  onReset: () => void;
}

export function FeedbackResults({ result, onReset }: FeedbackResultsProps) {
  const [showMarkScheme, setShowMarkScheme] = useState(false);

  const getScoreColor = (score: number, maxMarks: number) => {
    const percentage = (score / maxMarks) * 100;
    if (percentage >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number, maxMarks: number) => {
    const percentage = (score / maxMarks) * 100;
    if (percentage >= 80) return <Trophy className="h-5 w-5" />;
    if (percentage >= 60) return <Target className="h-5 w-5" />;
    return <MessageSquare className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <Card className="card-shadow rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                {getScoreIcon(result.score, result.maxMarks)}
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Your Score
                </CardTitle>
                <CardDescription className="text-gray-600">
                  AI analysis complete
                </CardDescription>
              </div>
            </div>
            <Badge 
              className={`px-4 py-2 text-lg font-bold border-2 ${getScoreColor(result.score, result.maxMarks)}`}
            >
              {result.score}/{result.maxMarks}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Feedback Highlights */}
      <Card className="card-shadow rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                AI Feedback
              </CardTitle>
              <CardDescription className="text-gray-600">
                Hover over highlights for detailed suggestions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <FeedbackHighlighter 
              highlights={result.highlights} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Model Answer / Mark Scheme */}
      {result.modelAnswer && (
        <Card className="card-shadow rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Eye className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Model Answer
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Official mark scheme reference
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMarkScheme(!showMarkScheme)}
                className="rounded-xl border-gray-200 bg-white/50 hover:bg-white"
              >
                {showMarkScheme ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showMarkScheme && (
            <CardContent>
              <ScrollArea className="h-64 w-full rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="font-mono text-sm text-gray-800 whitespace-pre-wrap">
                  {result.modelAnswer}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          onClick={onReset}
          variant="outline"
          className="rounded-2xl border-gray-200 bg-white/80 px-8 py-3 hover-lift"
        >
          Try Another Question
        </Button>
        <Button
          className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-3 text-white shadow-lg hover-lift"
        >
          Save Feedback
        </Button>
      </div>
    </div>
  );
}
