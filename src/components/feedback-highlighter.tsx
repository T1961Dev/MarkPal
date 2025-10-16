"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FeedbackHighlight {
  text: string;
  type: "correct" | "partial" | "incorrect";
  suggestion?: string;
}

interface FeedbackHighlighterProps {
  highlights: FeedbackHighlight[];
}

export function FeedbackHighlighter({ highlights }: FeedbackHighlighterProps) {
  const getHighlightColor = (type: string) => {
    switch (type) {
      case "correct":
        return "bg-green-100 text-green-800 border-green-200";
      case "partial":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "incorrect":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "";
    }
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case "correct":
        return "✓";
      case "partial":
        return "⚠";
      case "incorrect":
        return "✗";
      default:
        return "";
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {highlights.map((highlight, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <span
                className={`inline-block px-2 py-1 rounded-md border text-sm font-medium ${getHighlightColor(
                  highlight.type
                )} cursor-help transition-colors hover:opacity-80`}
              >
                <span className="mr-1">{getHighlightIcon(highlight.type)}</span>
                {highlight.text}
              </span>
            </TooltipTrigger>
            {highlight.suggestion && (
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{highlight.suggestion}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
