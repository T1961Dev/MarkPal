"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProgressButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number; // Duration in milliseconds
  icon?: React.ReactNode;
  isLoading?: boolean; // External loading state
}

export function ProgressButton({ 
  onClick, 
  disabled = false, 
  children, 
  className = "",
  duration = 6000, // Default 6 seconds to match timeout
  icon,
  isLoading = false
}: ProgressButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClick = () => {
    if (disabled || isProcessing) return;
    
    setIsProcessing(true);
    setProgress(0);
    onClick();
  };

  // Sync with external loading state
  useEffect(() => {
    if (isLoading && !isProcessing) {
      setIsProcessing(true);
      setProgress(0);
    } else if (!isLoading && isProcessing) {
      // External loading finished, reset after a short delay
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 500);
    }
  }, [isLoading, isProcessing]);

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const increment = 100 / (duration / 100); // Update every 100ms
          const newProgress = prev + increment;
          
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isProcessing, duration]);


  if (isProcessing) {
    return (
      <div className="relative w-full overflow-hidden rounded-md">
        <Button
          disabled
          className={`w-full relative z-10 border-0 bg-muted ${className}`}
        >
          {/* Progress bar overlay with accent blue */}
          <div 
            className="absolute inset-0 bg-primary transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
          <div className="relative z-10 flex items-center justify-center">
            <Loader2 
              className="w-4 h-4 mr-2 animate-spin transition-colors duration-200"
              style={{
                color: progress > 60 ? '#ffffff' : '#000000',
                filter: 'none',
                opacity: 1
              }}
            />
            <span 
              className="font-medium transition-colors duration-200"
              style={{
                color: progress > 60 ? '#ffffff' : '#000000',
                filter: 'none',
                opacity: 1,
                fontWeight: '600'
              }}
            >
              {progress < 20 ? 'Analyzing...' : 
               progress < 40 ? 'Processing...' : 
               progress < 60 ? 'Evaluating...' : 
               progress < 80 ? 'Finalizing...' : 
               'Almost done...'} {Math.round(progress)}%
            </span>
          </div>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      {icon}
      {children}
    </Button>
  );
}
