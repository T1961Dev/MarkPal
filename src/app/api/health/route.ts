import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if critical environment variables are present
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: !!process.env.NEXT_SERVICE_ROLE_SUPABASE_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      stripeKey: !!process.env.STRIPE_API_KEY,
      stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      basicPriceId: !!process.env.STRIPE_BASIC_PRICE_ID,
      proPriceId: !!process.env.STRIPE_PRO_PRICE_ID,
      proPlusPriceId: !!process.env.STRIPE_PRO_PLUS_PRICE_ID,
    }

    const missingVars = Object.entries(envCheck)
      .filter(([, present]) => !present)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        missing: missingVars,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'All environment variables present',
      timestamp: new Date().toISOString(),
      envCheck
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
