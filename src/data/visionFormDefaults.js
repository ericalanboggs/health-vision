// Canonical empty shape for the Vision / health-journey form.
//
// Extracted so any screen that seeds a journey before the Vision flow (e.g. the
// segment welcome screen) can write a complete row. The Vision loader hard-merges
// over this, so every key is always present — avoids partial rows turning
// controlled inputs into uncontrolled ones (undefined value).
//
// `segmentReason` / `segmentWhy` are captured on the segment welcome screen and
// fed into AI habit suggestions (see src/utils/aiService.js enhanceActionPlan).
export const EMPTY_VISION_FORM = {
  visionStatement: '',
  feelingState: '',
  appearanceConfidence: '',
  futureAbilities: '',
  whyMatters: '',
  motivationDrivers: [],
  stakes: '',
  benefits: '',
  meaningfulMoment: '',
  currentScore: 5,
  currentPositives: '',
  barriers: [],
  barriersNotes: '',
  habitsToImprove: [],
  focusAreas: [],
  timeCapacity: '',
  preferredTimes: '',
  sustainableNotes: '',
  readiness: 5,
  supportNeeds: [],
  // Segment onboarding (set on /welcome for marketing-acquired users)
  segmentReason: '',
  segmentWhy: '',
}
