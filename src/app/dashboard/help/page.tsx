"use client"

import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  HelpCircle, 
  BookOpen, 
  Target, 
  MessageCircle,
  Mail,
  ExternalLink,
  CheckCircle,
  ArrowRight
} from "lucide-react"

export default function Help() {
  const { user } = useAuth()

  if (!user) {
    return null // Will redirect
  }

  const faqs = [
    {
      question: "How does the AI marking work?",
      answer: "Our AI analyzes your answers against the mark scheme you provide, giving you detailed feedback on what you did well and what you can improve. It's trained on thousands of real GCSE exam papers."
    },
    {
      question: "Which subjects are supported?",
      answer: "We currently support Biology, Chemistry, Physics, and Computer Science GCSEs. All questions must be text-based - we don't support image-based questions or diagrams."
    },
    {
      question: "How accurate is the feedback?",
      answer: "Our AI provides feedback that closely matches what real examiners look for. While it's not perfect, it's designed to help you understand exam technique and improve your answers."
    },
    {
      question: "Can I practice unlimited questions?",
      answer: "Free users get 5 questions per day. Pro users get unlimited questions, advanced feedback, and access to the question bank. Premium users get all features plus live mode feedback."
    },
    {
      question: "How do I save my questions?",
      answer: "After completing a practice session, click the 'Save Question' button to store it in your saved questions. You can review these later and track your progress."
    },
    {
      question: "What's the difference between practice modes?",
      answer: "Individual Question Mode lets you paste any question and mark scheme. Question Bank Mode gives you access to our curated collection of GCSE questions organized by subject and difficulty."
    }
  ]

  const contactMethods = [
    {
      title: "Email Support",
      description: "Get help via email within 24 hours",
      icon: Mail,
      action: "Send Email",
      href: "mailto:support@markscheme.coach"
    },
    {
      title: "Live Chat",
      description: "Chat with our support team in real-time",
      icon: MessageCircle,
      action: "Start Chat",
      href: "#"
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Help & Support</h1>
            <p className="text-muted-foreground mt-2">
              Get help with using Mark Pal
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            We&apos;re here to help!
          </Badge>
        </div>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>
              Get up and running with Mark Pal in minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Choose Your Mode</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  Start with Individual Question Mode to practice with your own questions, or try Question Bank Mode for curated content.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <h3 className="font-semibold">Enter Your Content</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  Paste your question, mark scheme, and write your answer. The AI will analyze your response and provide detailed feedback.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <h3 className="font-semibold">Review & Improve</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  Read the feedback, save your questions, and track your progress in the analytics section to see your improvement over time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Common questions and answers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="space-y-2">
                    <h4 className="font-semibold text-sm">{faq.question}</h4>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Need more help? We&apos;re here for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contactMethods.map((method, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="p-3 rounded-full bg-primary/10">
                      <method.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{method.title}</h4>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={method.href}>
                        {method.action}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips for Success */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Tips for Success
            </CardTitle>
            <CardDescription>
              Get the most out of Mark Pal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Best Practices</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Practice daily for consistent improvement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Read feedback carefully and apply suggestions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Use the question bank to practice different topics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Save questions to track your progress</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Getting Better Results</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Provide clear, detailed mark schemes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Write complete answers with explanations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Focus on your weakest subjects first</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Review analytics to identify patterns</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
