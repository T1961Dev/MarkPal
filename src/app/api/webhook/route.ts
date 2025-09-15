import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabaseClient } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      await fulfillCheckout(session.id)
      break
    case 'checkout.session.async_payment_succeeded':
      const asyncSession = event.data.object as Stripe.Checkout.Session
      await fulfillCheckout(asyncSession.id)
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function fulfillCheckout(sessionId: string) {
  console.log('Fulfilling Checkout Session', sessionId)

  try {
    // Retrieve the Checkout Session from the API with line_items expanded
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    })

    // Check the Checkout Session's payment_status property
    if (checkoutSession.payment_status !== 'unpaid') {
      const userId = checkoutSession.metadata?.userId
      const tier = checkoutSession.metadata?.tier

      if (!userId || !tier) {
        console.error('Missing userId or tier in session metadata')
        return
      }

      // Update user tier and questions left in Supabase
      await updateUserSubscription(userId, tier)
    }
  } catch (error) {
    console.error('Error fulfilling checkout:', error)
  }
}

async function updateUserSubscription(userId: string, tier: string) {
  const supabase = createAdminSupabaseClient()

  try {
    // Get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('questionsLeft, tier')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching user:', fetchError)
      return
    }

    // Calculate new questions left based on tier
    const getQuestionLimit = (tier: string) => {
      switch (tier) {
        case 'free': return 5
        case 'basic': return 20
        case 'pro': return 100
        case 'pro+': return 999999
        default: return 5
      }
    }

    const newQuestionLimit = getQuestionLimit(tier)
    const currentQuestionsLeft = currentUser.questionsLeft || 0
    const additionalQuestions = newQuestionLimit - getQuestionLimit(currentUser.tier || 'free')
    const newQuestionsLeft = Math.max(0, currentQuestionsLeft + additionalQuestions)

    // Update user tier and questions left
    const { error: updateError } = await supabase
      .from('users')
      .update({
        tier: tier,
        questionsLeft: newQuestionsLeft,
        questions_reset_date: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user subscription:', updateError)
      return
    }

    console.log(`Successfully updated user ${userId} to tier ${tier} with ${newQuestionsLeft} questions left`)
  } catch (error) {
    console.error('Error in updateUserSubscription:', error)
  }
}


