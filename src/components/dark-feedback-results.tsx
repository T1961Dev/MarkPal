"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeedbackHighlighter } from "./feedback-highlighter";
import { Eye, EyeOff, Trophy, Target, MessageSquare, ArrowLeft, Download } from "lucide-react";

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

interface DarkFeedbackResultsProps {
  result: FeedbackResult;
  onReset: () => void;
}

export function DarkFeedbackResults({ result, onReset }: DarkFeedbackResultsProps) {
  const [showMarkScheme, setShowMarkScheme] = useState(false);

  const getScoreColor = (score: number, maxMarks: number) => {
    const percentage = (score / maxMarks) * 100;
    if (percentage >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number, maxMarks: number) => {
    const percentage = (score / maxMarks) * 100;
    if (percentage >= 80) return <Trophy className="h-8 w-8" />;
    if (percentage >= 60) return <Target className="h-8 w-8" />;
    return <MessageSquare className="h-8 w-8" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Score Card */}
      <div className="glass-effect rounded-2xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-6 shadow-lg">
            {getScoreIcon(result.score, result.maxMarks)}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Your Score
          </h1>
          <Badge 
            className={`px-6 py-3 text-xl font-bold border-2 ${getScoreColor(result.score, result.maxMarks)}`}
          >
            {result.score}/{result.maxMarks}
          </Badge>
          <p className="text-lg text-gray-600 mt-4">
            AI analysis complete
          </p>
        </div>
      </div>

      {/* Feedback Highlights */}
      <div className="glass-effect rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4 shadow-lg">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            AI Feedback
          </h2>
          <p className="text-base text-gray-600">
            Hover over highlights for detailed suggestions
          </p>
        </div>
        
        <div className="rounded-xl bg-gray-50 p-6 border border-gray-200">
          <FeedbackHighlighter 
            text={result.feedback} 
            highlights={result.highlights} 
          />
        </div>
      </div>

      {/* Model Answer / Mark Scheme */}
      {result.modelAnswer && (
        <div className="glass-effect rounded-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <Eye className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Model Answer
                </h2>
                <p className="text-base text-gray-600">
                  Official mark scheme reference
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowMarkScheme(!showMarkScheme)}
              className="rounded-xl border-gray-200 bg-white/80 backdrop-blur-xl text-gray-700 hover:bg-gray-50 px-6 py-3 hover-lift"
            >
              {showMarkScheme ? (
                <>
                  <EyeOff className="mr-2 h-5 w-5" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-5 w-5" />
                  Show
                </>
              )}
            </Button>
          </div>
          
          {showMarkScheme && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <ScrollArea className="h-80 w-full">
                <div className="font-mono text-base text-gray-800 whitespace-pre-wrap">
                  {result.modelAnswer}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-6">
        <Button
          onClick={onReset}
          variant="outline"
          size="lg"
          className="rounded-xl border-gray-200 bg-white/80 backdrop-blur-xl text-gray-700 hover:bg-gray-50 px-8 py-3 text-base hover-lift"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Try Another Question
        </Button>
        <Button
          size="lg"
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3 text-base hover-lift"
        >
          <Download className="mr-2 h-5 w-5" />
          Save Feedback
        </Button>
      </div>
    </div>
  );
}
