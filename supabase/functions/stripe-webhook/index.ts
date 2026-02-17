import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const STRIPE_PRICE_CORE = Deno.env.get('STRIPE_PRICE_CORE')
const STRIPE_PRICE_PLUS = Deno.env.get('STRIPE_PRICE_PLUS')
const STRIPE_PRICE_PREMIUM = Deno.env.get('STRIPE_PRICE_PREMIUM')

const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

// Map Stripe price IDs to tier names
function getTierFromPriceId(priceId: string): string | null {
  if (priceId === STRIPE_PRICE_CORE) return 'core'
  if (priceId === STRIPE_PRICE_PLUS) return 'plus'
  if (priceId === STRIPE_PRICE_PREMIUM) return 'premium'
  return null
}

serve(async (req) => {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate Stripe signature (async required in Deno)
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    console.log(`Processing Stripe event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        if (!userId) {
          console.error('No client_reference_id on checkout session')
          break
        }

        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        // Retrieve the subscription to get price and trial info
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const subItem = subscription.items.data[0]
        const priceId = subItem?.price?.id
        const tier = priceId ? getTierFromPriceId(priceId) : null
        // current_period_end moved to item level in newer Stripe API versions
        const periodEnd = subscription.current_period_end ?? subItem?.current_period_end

        const { error } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: subscription.status,
            subscription_tier: tier,
            trial_ends_at: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            subscription_current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq('id', userId)

        if (error) {
          console.error('Error updating profile after checkout:', error)
        } else {
          console.log(`Checkout completed for user ${userId}, tier: ${tier}, status: ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const subItem = subscription.items.data[0]
        const priceId = subItem?.price?.id
        const tier = priceId ? getTierFromPriceId(priceId) : null
        const periodEnd = subscription.current_period_end ?? subItem?.current_period_end

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            subscription_tier: tier,
            subscription_current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            trial_ends_at: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating subscription:', error)
        } else {
          console.log(`Subscription updated for customer ${customerId}, status: ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating deleted subscription:', error)
        } else {
          console.log(`Subscription deleted for customer ${customerId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { error } = await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating past_due status:', error)
        } else {
          console.log(`Payment failed for customer ${customerId}, set to past_due`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in stripe-webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
