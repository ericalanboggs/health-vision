import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL')

const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Create Supabase client with user's auth token
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Service role client for profile operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch stripe_customer_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found. Please subscribe first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Fetch all active recurring prices and group by product
    const prices = await stripe.prices.list({ active: true, type: 'recurring', limit: 100 })
    const productPriceMap: Record<string, string[]> = {}
    for (const price of prices.data) {
      const productId = typeof price.product === 'string' ? price.product : price.product.id
      if (!productPriceMap[productId]) {
        productPriceMap[productId] = []
      }
      productPriceMap[productId].push(price.id)
    }

    const products = Object.entries(productPriceMap).map(([product, priceIds]) => ({
      product,
      prices: priceIds,
    }))

    // Create a portal configuration with plan switching enabled
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your Summit subscription',
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'always_invoice',
          products,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
        },
        payment_method_update: {
          enabled: true,
        },
        invoice_history: {
          enabled: true,
        },
      },
    })

    // Create Customer Portal session with the configuration
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${FRONTEND_URL}/profile`,
      configuration: configuration.id,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )

  } catch (error) {
    console.error('Error in create-portal-session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
