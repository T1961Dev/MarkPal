import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { tier, userId } = await request.json()
    const headersList = await headers()
    const origin = headersList.get('origin')

    // Define price IDs for different tiers
    const priceIds = {
      basic: process.env.STRIPE_BASIC_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID,
      'pro+': process.env.STRIPE_PRO_PLUS_PRICE_ID,
    }

    const priceId = priceIds[tier as keyof typeof priceIds]
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid tier selected' },
        { status: 400 }
      )
    }

    // Get user email and current subscription from Supabase
    const supabase = createAdminSupabaseClient()
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !userData.user?.email) {
      console.error('Error fetching user email:', userError)
      return NextResponse.json(
        { error: 'Unable to fetch user email' },
        { status: 400 }
      )
    }

    // Get user's current subscription info
    const { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('tier, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userFetchError) {
      console.error('Error fetching user subscription:', userFetchError)
      return NextResponse.json(
        { error: 'Unable to fetch user subscription' },
        { status: 400 }
      )
    }

    // Store existing subscription info for later cancellation after successful payment
    let existingSubscriptionIds: string[] = []
    if (user.stripe_customer_id && user.tier !== 'free') {
      try {
        // Get existing subscriptions for the customer
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'active'
        })

        // Store subscription IDs to cancel after successful payment
        existingSubscriptionIds = existingSubscriptions.data.map(sub => sub.id)
      } catch (error) {
        console.error('Error fetching existing subscriptions:', error)
        // Continue with new subscription creation
      }
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&user_id=${userId}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        userId: userId,
        tier: tier,
        existingSubscriptionIds: JSON.stringify(existingSubscriptionIds),
      },
      customer_email: userData.user.email,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Error creating checkout session:', err)
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    )
  }
}
