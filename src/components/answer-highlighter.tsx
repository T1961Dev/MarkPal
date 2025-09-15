"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnswerHighlight {
  text: string;
  type: "success" | "warning" | "error";
  tooltip?: string;
}

interface AnswerHighlighterProps {
  answerText: string;
  highlights: AnswerHighlight[];
}

export function AnswerHighlighter({ answerText, highlights }: AnswerHighlighterProps) {
  const getHighlightColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800";
      case "warning":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800";
      case "error":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800";
      default:
        return "";
    }
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✗";
      default:
        return "";
    }
  };

  // Function to highlight text segments
  const highlightText = (text: string, highlights: AnswerHighlight[]) => {
    if (!highlights || highlights.length === 0) {
      // If no highlights provided, show the text as-is
      return <span>{text}</span>;
    }

    // Sort highlights by length (longest first) to handle overlapping matches
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
    
    let result = text;
    const highlightRanges: Array<{
      start: number;
      end: number;
      highlight: AnswerHighlight;
    }> = [];

    // Find all highlight ranges
    sortedHighlights.forEach(highlight => {
      const searchText = highlight.text.toLowerCase();
      const textLower = result.toLowerCase();
      let startIndex = 0;
      
      while (true) {
        const index = textLower.indexOf(searchText, startIndex);
        if (index === -1) break;
        
        highlightRanges.push({
          start: index,
          end: index + highlight.text.length,
          highlight
        });
        
        startIndex = index + 1;
      }
    });

    // Sort ranges by start position
    highlightRanges.sort((a, b) => a.start - b.start);

    // Merge overlapping ranges
    const mergedRanges: Array<{
      start: number;
      end: number;
      highlights: AnswerHighlight[];
    }> = [];

    highlightRanges.forEach(range => {
      const lastRange = mergedRanges[mergedRanges.length - 1];
      
      if (!lastRange || range.start >= lastRange.end) {
        mergedRanges.push({
          start: range.start,
          end: range.end,
          highlights: [range.highlight]
        });
      } else {
        lastRange.end = Math.max(lastRange.end, range.end);
        if (!lastRange.highlights.find(h => h.text === range.highlight.text)) {
          lastRange.highlights.push(range.highlight);
        }
      }
    });

    // Build the JSX with highlights
    const elements: React.ReactElement[] = [];
    let lastIndex = 0;

    mergedRanges.forEach((range, index) => {
      // Add text before highlight
      if (range.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, range.start)}
          </span>
        );
      }

      // Add highlighted text
      const highlightedText = text.slice(range.start, range.end);
      const primaryHighlight = range.highlights[0]; // Use first highlight for styling
      
      elements.push(
        <Tooltip key={`highlight-${index}`}>
          <TooltipTrigger asChild>
            <span
              className={`inline-block px-1 py-0.5 rounded-md border text-sm font-medium ${getHighlightColor(
                primaryHighlight.type
              )} cursor-help transition-all duration-200 hover:opacity-80 hover:scale-105`}
            >
              <span className="mr-1 text-xs">{getHighlightIcon(primaryHighlight.type)}</span>
              {highlightedText}
            </span>
          </TooltipTrigger>
          {primaryHighlight.tooltip && (
            <TooltipContent 
              className={`max-w-xs animate-in slide-in-from-bottom-2 fade-in-0 duration-200 ${
                primaryHighlight.type === "success" 
                  ? "bg-green-50 border-green-200 text-green-800" 
                  : primaryHighlight.type === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <p className="text-sm font-medium">{primaryHighlight.tooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
      );

      lastIndex = range.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return <>{elements}</>;
  };

  return (
    <TooltipProvider>
      <div className="leading-relaxed">
        {highlightText(answerText, highlights)}
      </div>
    </TooltipProvider>
  );
}
