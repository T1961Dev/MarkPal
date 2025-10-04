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
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionUpdate(subscription)
      break
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription
      await handleSubscriptionCancellation(deletedSubscription)
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
      const customerId = typeof checkoutSession.customer === 'string' 
        ? checkoutSession.customer 
        : checkoutSession.customer?.id

      if (!userId || !tier) {
        console.error('Missing userId or tier in session metadata')
        return
      }

      // Cancel existing subscriptions if any (only after successful payment)
      const existingSubscriptionIds = checkoutSession.metadata?.existingSubscriptionIds
      if (existingSubscriptionIds) {
        try {
          const subscriptionIds = JSON.parse(existingSubscriptionIds) as string[]
          for (const subscriptionId of subscriptionIds) {
            await stripe.subscriptions.cancel(subscriptionId)
            console.log(`Cancelled existing subscription ${subscriptionId} for user ${userId}`)
          }
        } catch (cancelError) {
          console.error('Error cancelling existing subscriptions:', cancelError)
          // Continue with subscription update even if cancellation fails
        }
      }

      // Update user tier and questions left in Supabase
      await updateUserSubscription(userId, tier, customerId)
    }
  } catch (error) {
    console.error('Error fulfilling checkout:', error)
  }
}

async function updateUserSubscription(userId: string, tier: string, customerId?: string | null) {
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
    const updateData: any = {
      tier: tier,
      questionsLeft: newQuestionsLeft,
      questions_reset_date: new Date().toISOString()
    }
    
    // Only update customer ID if provided
    if (customerId) {
      updateData.stripe_customer_id = customerId
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
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

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    const supabase = createAdminSupabaseClient()
    
    // Find user by customer ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tier, stripe_customer_id')
      .eq('stripe_customer_id', customerId)
      .single()
    
    if (userError || !user) {
      console.error('Error finding user for subscription update:', userError)
      return
    }
    
    // Get the price ID to determine the new tier
    const priceId = subscription.items.data[0]?.price.id
    const tier = getTierFromPriceId(priceId)
    
    if (tier && tier !== user.tier) {
      await updateUserSubscription(user.id, tier)
    }
  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    const supabase = createAdminSupabaseClient()
    
    // Find user by customer ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()
    
    if (userError || !user) {
      console.error('Error finding user for subscription cancellation:', userError)
      return
    }
    
    // Downgrade user to free tier
    await updateUserSubscription(user.id, 'free')
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
  }
}

function getTierFromPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null
  
  const priceIds = {
    [process.env.STRIPE_BASIC_PRICE_ID!]: 'basic',
    [process.env.STRIPE_PRO_PRICE_ID!]: 'pro',
    [process.env.STRIPE_PRO_PLUS_PRICE_ID!]: 'pro+'
  }
  
  return priceIds[priceId] || null
}


