import 'server-only'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_API_LIVE_KEY!, {
  apiVersion: '2025-08-27.basil',
})
