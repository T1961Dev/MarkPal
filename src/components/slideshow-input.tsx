"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, BookOpen, FileText, PenTool, Target } from "lucide-react";
import { Navbar } from "./navbar";

interface SlideshowInputProps {
  onSubmit: (data: {
    question: string;
    markScheme: string;
    studentAnswer: string;
    maxMarks: number;
  }) => void;
  isLoading?: boolean;
}

export function SlideshowInput({ onSubmit, isLoading = false }: SlideshowInputProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [question, setQuestion] = useState("");
  const [markScheme, setMarkScheme] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  
  const questionRef = useRef<HTMLInputElement>(null);
  const markSchemeRef = useRef<HTMLInputElement>(null);
  const studentAnswerRef = useRef<HTMLInputElement>(null);

  const slides = [
    {
      id: 0,
      title: "Question",
      subtitle: "Paste the exam question",
      icon: BookOpen,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-500/10",
      input: (
        <div className="relative">
          <div className="gradient-border">
            <Input
              ref={questionRef}
              placeholder="Paste the exam question here..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && question.trim().length > 0) {
                  nextSlide();
                }
              }}
              className="h-20 text-lg resize-none rounded-2xl border-0 bg-white backdrop-blur-xl text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:outline-none px-6 py-4 text-center"
            />
          </div>
        </div>
      ),
      canProceed: question.trim().length > 0
    },
    {
      id: 1,
      title: "Mark Scheme",
      subtitle: "Paste the official mark scheme",
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      input: (
        <div className="relative">
          <div className="gradient-border">
            <Input
              ref={markSchemeRef}
              placeholder="Paste the official mark scheme here..."
              value={markScheme}
              onChange={(e) => setMarkScheme(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && markScheme.trim().length > 0) {
                  nextSlide();
                }
              }}
              className="h-20 text-lg resize-none rounded-2xl border-0 bg-white backdrop-blur-xl text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:outline-none px-6 py-4 text-center font-mono"
            />
          </div>
        </div>
      ),
      canProceed: markScheme.trim().length > 0
    },
    {
      id: 2,
      title: "Your Answer",
      subtitle: "Write or paste your answer",
      icon: PenTool,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      input: (
        <div className="space-y-6">
          <div className="relative">
            <div className="gradient-border">
              <Input
                ref={studentAnswerRef}
                placeholder="Write your answer here..."
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && studentAnswer.trim().length > 0) {
                    nextSlide();
                  }
                }}
                className="h-20 text-lg resize-none rounded-2xl border-0 bg-white backdrop-blur-xl text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:outline-none px-6 py-4 text-center"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              placeholder="Max marks (optional)"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              className="flex-1 rounded-xl border-gray-200 bg-white backdrop-blur-xl text-gray-900 placeholder:text-gray-500 focus:border-emerald-400 focus:ring-emerald-400/20 h-12 text-base px-4"
            />
            <Badge variant="secondary" className="rounded-lg bg-gray-100 text-gray-700 border-gray-200 px-3 py-1">
              Optional
            </Badge>
          </div>
        </div>
      ),
      canProceed: studentAnswer.trim().length > 0
    }
  ];

  const currentSlideData = slides[currentSlide];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Submit the form
      onSubmit({
        question,
        markScheme,
        studentAnswer,
        maxMarks: parseInt(maxMarks) || 0,
      });
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <>
      <Navbar currentSlide={currentSlide} totalSlides={slides.length} />
      <div className="w-full max-w-4xl mx-auto pt-24">
        {/* Slide Container */}
        <div className="relative">
          <div className="slide-container">
            <div className="slide">
              <div className="text-center mb-12">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${currentSlideData.color} mb-6 shadow-lg`}>
                  <currentSlideData.icon className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  {currentSlideData.title}
                </h2>
                <p className="text-lg text-gray-600">
                  {currentSlideData.subtitle}
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                {currentSlideData.input}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-12 max-w-2xl mx-auto">
                <Button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  variant="outline"
                  className="rounded-xl border-gray-200 bg-white/80 backdrop-blur-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 text-base hover-lift"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>

                <Button
                  onClick={nextSlide}
                  disabled={!currentSlideData.canProceed || isLoading}
                  className={`rounded-xl px-8 py-3 text-base hover-lift ${
                    currentSlide === slides.length - 1
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Analyzing...
                    </div>
                  ) : currentSlide === slides.length - 1 ? (
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Get Feedback
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Next
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
