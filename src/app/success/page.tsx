import { redirect } from 'next/navigation'
import { stripe } from '@/lib/stripe'
import { createAdminSupabaseClient, getQuestionLimit } from '@/lib/supabase'

export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; user_id?: string }>
}) {
  const { session_id, user_id } = await searchParams

  if (!session_id) {
    throw new Error('Please provide a valid session_id (`cs_test_...`)')
  }

  if (!user_id) {
    throw new Error('User ID is required')
  }

  try {
    const {
      status,
      customer_details,
      customer,
      metadata,
    } = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'payment_intent', 'customer'],
    })

    if (status === 'open') {
      return redirect('/')
    }

    if (status === 'complete') {
      // Update user tier in database
      const supabase = createAdminSupabaseClient()
      const tier = metadata?.tier as 'basic' | 'pro' | 'pro+'
      const questionLimit = getQuestionLimit(tier)

      // Set reset date to next month
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const { error } = await supabase
        .from('users')
        .update({
          tier: tier,
          questionsLeft: questionLimit,
          questions_reset_date: nextMonth.toISOString().split('T')[0], // Format as YYYY-MM-DD
          stripe_customer_id: customer || null, // Update stripe customer ID
        })
        .eq('id', user_id)

      if (error) {
        console.error('Error updating user tier:', error)
        throw new Error('Failed to update user subscription')
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Payment Successful!
              </h1>
              <p className="text-muted-foreground">
                Thank you for upgrading to the {tier} plan! Your subscription has been activated.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You now have {questionLimit} questions per month.
                </p>
              </div>
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Continue to App
              </a>
            </div>
          </div>
        </div>
      )
    }

    return redirect('/')
  } catch (error) {
    console.error('Error processing success page:', error)
    return redirect('/?error=payment_processing')
  }
}
