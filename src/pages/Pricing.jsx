import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowBack, ExpandMore } from '@mui/icons-material'
import { getCurrentUser, getProfile } from '../services/authService'
import { createCheckoutSession, createPortalSession, hasActiveSubscription } from '../services/subscriptionService'
import { Button, Tag } from '@summit/design-system'

const PRICE_IDS = {
  core: import.meta.env.VITE_STRIPE_PRICE_CORE,
  plus: import.meta.env.VITE_STRIPE_PRICE_PLUS,
  premium: import.meta.env.VITE_STRIPE_PRICE_PREMIUM,
}

const CORE_FEATURES = [
  'Health vision & goal setting',
  'Smart habit scheduling',
  'Daily SMS reminders',
  'Habit tracking & streaks',
  'Weekly reflections',
  'AI-powered weekly digests',
  'Personalized resource library',
]

const PLUS_COACHING = [
  'Work through a specific challenge',
  'Plan around upcoming life events',
  'Coach-assisted habit & schedule adjustments',
]

const PREMIUM_COACHING = [
  'Refine and evolve your health vision',
  'Design personalized lifestyle strategies',
  'Coach-assisted habit & schedule adjustments',
]

const COMPARISON_ROWS = [
  ['Habit Tracking & Streaks', 'AI-Powered', 'AI-Powered', 'AI + Human Audit'],
  ['Weekly Progress Digests', 'Automated', 'Automated', 'Coach-Reviewed'],
  ['Goal Setting', 'Self-Guided', '15-min Setup', 'Deep Strategy Session'],
  ['Monthly 1:1 Coaching', '\u2014', '1 x 15-min Sprint', '2 x 30-min Deep Dives'],
  ['Text Support', 'SMS Reminders', 'SMS Reminders', 'Concierge 1:1 Texting'],
  ['Lifestyle Adjustments', 'DIY', 'Coach-Assisted', 'Proactive White-Glove'],
]

const FAQS = [
  {
    q: 'How does the 7-day free trial work?',
    a: 'Start any plan and get full access for 7 days — habits, reminders, reflections, digests, and coaching (on Plus & Premium). You won\'t be charged until day 8. Cancel anytime before then with no charge.',
  },
  {
    q: 'Are the coaches real humans?',
    a: 'Yes. Summit coaches are real people trained in health behavior change. They\'re not therapists or doctors — they\'re partners who help you think through challenges, stay accountable, and make a plan that fits your life.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Absolutely. Upgrade or downgrade anytime from your Profile page. Changes take effect at the start of your next billing cycle.',
  },
  {
    q: 'Is there a discount for annual billing?',
    a: 'Not yet, but it\'s coming. We\'re keeping things simple during our initial launch. Stay tuned.',
  },
  {
    q: 'What if I miss a day or a reflection?',
    a: 'No guilt, no penalties. Summit is built around consistency, not perfection. Miss a day and pick back up tomorrow — your streaks reset, but your progress doesn\'t.',
  },
  {
    q: 'What exactly is "Concierge Text Support"?',
    a: 'Premium members can text their coach directly during business hours for quick questions, habit adjustments, or encouragement between sessions. Think of it as having a health-minded friend on speed dial.',
  },
]

const TIER_ORDER = { core: 0, plus: 1, premium: 2 }

export default function Pricing() {
  const navigate = useNavigate()
  const [loadingTier, setLoadingTier] = useState(null)
  const [error, setError] = useState(null)
  const [currentTier, setCurrentTier] = useState(null)
  const isSubscriber = currentTier !== null

  useEffect(() => {
    const loadCurrentTier = async () => {
      const { user } = await getCurrentUser()
      if (user) {
        const result = await getProfile(user.id)
        if (result.success && result.data && hasActiveSubscription(result.data)) {
          setCurrentTier(result.data.subscription_tier)
        }
      }
    }
    loadCurrentTier()
  }, [])

  const handleSelectTier = async (tierKey) => {
    setError(null)
    setLoadingTier(tierKey)

    try {
      const { user } = await getCurrentUser()
      if (!user) {
        navigate('/login', { state: { returnTo: '/pricing' } })
        return
      }

      const priceId = PRICE_IDS[tierKey]
      if (!priceId) {
        setError('Price configuration missing. Please contact support.')
        setLoadingTier(null)
        return
      }

      const result = await createCheckoutSession(priceId)
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        setError('Failed to start checkout. Please try again.')
        setLoadingTier(null)
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError('Something went wrong. Please try again.')
      setLoadingTier(null)
    }
  }

  const handleChangePlan = async (tierKey) => {
    setError(null)
    setLoadingTier(tierKey)
    try {
      const result = await createPortalSession()
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        setError('Failed to open plan management. Please try again.')
        setLoadingTier(null)
      }
    } catch (err) {
      console.error('Portal error:', err)
      setError('Something went wrong. Please try again.')
      setLoadingTier(null)
    }
  }

  const getTierButtonLabel = (tierKey) => {
    if (!isSubscriber) return 'Start Free Trial'
    return TIER_ORDER[tierKey] > TIER_ORDER[currentTier] ? 'Upgrade' : 'Downgrade'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7FAF9] to-[#EEF3F1]">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-text-muted hover:text-summit-forest transition-colors"
          >
            <ArrowBack className="h-5 w-5" />
            <span className="text-body">Back</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-summit-moss mb-3">Pricing</p>
          <h1 className="text-h1 text-summit-forest mb-4">Choose Your Plan</h1>
          <p className="text-body text-summit-forest/80 max-w-2xl mx-auto">
            {isSubscriber
              ? 'All Summit features are included at every tier — plans differ only in coaching access. Changes take effect at the start of your next billing cycle.'
              : 'Every plan includes a 7-day free trial. All Summit features are included at every tier — plans differ only in coaching access.'}
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 text-body-sm">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

          {/* Core */}
          <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] p-6 flex flex-col ">
            <div className="text-center pb-4">
              <h2 className="text-h2 text-summit-forest">Core</h2>
              <div className="mt-2 mb-2">
                <span className="text-[44px] font-bold text-summit-forest tracking-tight">$12</span>
                <span className="text-sm font-medium text-text-muted">/month</span>
              </div>
              {!isSubscriber && <Tag variant="secondary" size="sm">7-day free trial</Tag>}
              <p className="mt-4 text-body font-semibold text-summit-forest leading-snug">
                Everything you need to build lasting health habits.
              </p>
            </div>

            <div className="flex-1 pt-4 pb-6 space-y-3.5">
              {CORE_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-summit-mint flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-summit-emerald" />
                  </div>
                  <span className="text-body-sm text-text-secondary">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-black/[0.06]">
              {currentTier === 'core' ? (
                <div className="w-full text-center py-3 text-body-sm font-semibold text-summit-moss">
                  Current Plan
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full !rounded-xl"
                  onClick={() => isSubscriber ? handleChangePlan('core') : handleSelectTier('core')}
                  loading={loadingTier === 'core'}
                  disabled={loadingTier !== null}
                >
                  {getTierButtonLabel('core')}
                </Button>
              )}
            </div>
          </div>

          {/* Plus — Recommended */}
          <div className="relative md:scale-[1.03] md:z-10 flex flex-col">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
              <Tag variant="primary" size="sm" className="shadow-md">Recommended</Tag>
            </div>
            <div className="rounded-2xl bg-[#F3FBF7] ring-2 ring-summit-emerald shadow-[0_2px_4px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.08)] p-6 flex flex-col flex-1">
              <div className="text-center pb-4">
                <h2 className="text-h2 text-summit-forest">Plus</h2>
                <div className="mt-2 mb-2">
                  <span className="text-[44px] font-bold text-summit-forest tracking-tight">$29</span>
                  <span className="text-sm font-medium text-text-muted">/month</span>
                </div>
                {!isSubscriber && <Tag variant="secondary" size="sm">7-day free trial</Tag>}
                <p className="mt-4 text-body font-semibold text-summit-forest leading-snug">
                  Everything in Core, plus coaching to keep you on track.
                </p>
              </div>

              <div className="flex-1 pt-4 pb-6">
                <p className="text-body-sm font-semibold text-summit-forest mb-2">
                  1 focused session / month (15 min)
                </p>
                <p className="text-xs text-summit-forest/70 mb-4">
                  Short, action-oriented coaching for when you need a quick adjustment:
                </p>
                <div className="space-y-3">
                  {PLUS_COACHING.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-summit-mint flex items-center justify-center mt-0.5">
                        <CheckCircle className="h-4 w-4 text-summit-emerald" />
                      </div>
                      <span className="text-body-sm text-text-secondary">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-summit-emerald/20">
                {currentTier === 'plus' ? (
                  <div className="w-full text-center py-3 text-body-sm font-semibold text-summit-moss">
                    Current Plan
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full !rounded-xl shadow-[0_6px_16px_rgba(21,143,90,0.3)] hover:shadow-[0_8px_20px_rgba(21,143,90,0.4)]"
                    onClick={() => isSubscriber ? handleChangePlan('plus') : handleSelectTier('plus')}
                    loading={loadingTier === 'plus'}
                    disabled={loadingTier !== null}
                  >
                    {getTierButtonLabel('plus')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Premium */}
          <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] p-6 flex flex-col ">
            <div className="text-center pb-4">
              <h2 className="text-h2 text-summit-forest">Premium</h2>
              <div className="mt-2 mb-2">
                <span className="text-[44px] font-bold text-summit-forest tracking-tight">$89</span>
                <span className="text-sm font-medium text-text-muted">/month</span>
              </div>
              {!isSubscriber && <Tag variant="secondary" size="sm">7-day free trial</Tag>}
              <p className="mt-4 text-body font-semibold text-summit-forest leading-snug">
                Everything in Plus, with deeper coaching for lasting change.
              </p>
            </div>

            <div className="flex-1 pt-4 pb-6">
              <p className="text-body-sm font-semibold text-summit-forest mb-1">
                Concierge text support during business hours
              </p>
              <p className="text-body-sm font-semibold text-summit-forest mb-2">
                2 deep sessions / month (30 min each)
              </p>
              <p className="text-xs text-summit-forest/70 mb-4">
                Strategic coaching to help you reach your summit:
              </p>
              <div className="space-y-3">
                {PREMIUM_COACHING.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-summit-mint flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-summit-emerald" />
                    </div>
                    <span className="text-body-sm text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-black/[0.06]">
              {currentTier === 'premium' ? (
                <div className="w-full text-center py-3 text-body-sm font-semibold text-summit-moss">
                  Current Plan
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full !rounded-xl"
                  onClick={() => isSubscriber ? handleChangePlan('premium') : handleSelectTier('premium')}
                  loading={loadingTier === 'premium'}
                  disabled={loadingTier !== null}
                >
                  {getTierButtonLabel('premium')}
                </Button>
              )}
            </div>
          </div>

        </div>

        {/* Feature Comparison Table */}
        <div className="mt-24">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-summit-moss text-center mb-3">Compare</p>
          <h2 className="text-h2 text-summit-forest text-center mb-10">
            Self-Serve vs. Human-Assisted
          </h2>
          <div className="rounded-2xl overflow-hidden border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-summit-pine">
                    <th className="px-6 py-4 text-body-sm font-semibold text-white">Feature</th>
                    <th className="px-6 py-4 text-body-sm font-semibold text-white text-center">Core</th>
                    <th className="px-6 py-4 text-body-sm font-semibold text-white text-center bg-white/10">Plus</th>
                    <th className="px-6 py-4 text-body-sm font-semibold text-white text-center">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COMPARISON_ROWS.map(([feature, core, plus, premium], i) => (
                    <tr key={feature} className={i % 2 === 0 ? 'bg-white' : 'bg-black/[0.02]'}>
                      <td className="px-6 py-4 text-body-sm font-semibold text-summit-forest">{feature}</td>
                      <td className="px-6 py-4 text-body-sm text-text-secondary text-center">{core}</td>
                      <td className="px-6 py-4 text-body-sm text-text-secondary text-center bg-summit-mint/20 font-medium">{plus}</td>
                      <td className="px-6 py-4 text-body-sm text-text-secondary text-center">{premium}</td>
                    </tr>
                  ))}
                  <tr className="bg-summit-sage/20">
                    <td className="px-6 py-4 text-body-sm font-semibold text-summit-forest">Best For</td>
                    <td className="px-6 py-4 text-body-sm font-semibold text-summit-moss text-center">The Solo Climber</td>
                    <td className="px-6 py-4 text-body-sm font-semibold text-summit-moss text-center bg-summit-mint/30">The "Need a Nudge"</td>
                    <td className="px-6 py-4 text-body-sm font-semibold text-summit-moss text-center">The Total Transformation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-24 mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-summit-moss text-center mb-3">Support</p>
          <h2 className="text-h2 text-summit-forest text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {FAQS.map(({ q, a }) => (
              <FaqItem key={q} question={q} answer={a} />
            ))}
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-body-sm text-summit-forest">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-summit-emerald" />
            <span>Cancel anytime</span>
          </div>
          <span className="text-gray-300">|</span>
          {!isSubscriber && (
            <>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-summit-emerald" />
                <span>No charge until trial ends</span>
              </div>
              <span className="text-gray-300">|</span>
            </>
          )}
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-summit-emerald" />
            <span>Switch plans anytime</span>
          </div>
        </div>
      </main>
    </div>
  )
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-xl border border-black/[0.06] shadow-sm overflow-hidden cursor-pointer bg-white hover:bg-summit-mint/10 transition-colors duration-150"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="text-body-sm font-semibold text-summit-forest pr-4">{question}</h3>
        <ExpandMore
          className={`h-5 w-5 text-summit-moss flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </div>
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          open ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-4">
          <p className="text-body-sm text-text-secondary leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}
