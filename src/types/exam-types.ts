// Shared types for exam upload functionality

export interface ExtractedQuestion {
  id: string
  text: string
  questionNumber?: string
  marks?: string
  type: 'text' | 'multiple-choice' | 'essay' | 'short-answer'
  markScheme?: string
  maxMarks?: number
  subject?: string
  topic?: string
  level?: string
  difficulty?: string
}

export interface PDFMetadata {
  pages: number
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
}

// Legacy interface for backward compatibility
export interface LegacyExtractedQuestion {
  question: string
  mark_scheme: string
  marks: number
  question_type: string
  difficulty: string
}
