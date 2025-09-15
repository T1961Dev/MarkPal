"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProgressButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number; // Duration in milliseconds
  icon?: React.ReactNode;
}

export function ProgressButton({ 
  onClick, 
  disabled = false, 
  children, 
  className = "",
  duration = 6000, // Default 6 seconds to match timeout
  icon
}: ProgressButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClick = () => {
    if (disabled || isProcessing) return;
    
    setIsProcessing(true);
    setProgress(0);
    onClick();
  };

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const increment = 100 / (duration / 100); // Update every 100ms
          const newProgress = prev + increment;
          
          if (newProgress >= 100) {
            clearInterval(interval);
            // Reset after completion
            setTimeout(() => {
              setIsProcessing(false);
              setProgress(0);
            }, 500);
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
      <div className="relative w-full">
        <Button
          disabled
          className={`w-full ${className}`}
        >
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </Button>
        <Progress 
          value={progress} 
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-md" 
        />
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
