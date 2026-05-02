# Summit Health — iOS Native Conversion Plan

> SwiftUI app backed by the same Supabase backend + edge functions.
> Last updated: 2026-03-31.

---

## Why SwiftUI

- Declarative UI maps closely to the React mental model you already know
- First-class support for `async/await`, Combine, and SwiftData
- A habit/health app exercises nearly every meaningful iOS concept: auth, networking, local notifications, persistence, widgets, HealthKit, animations
- You'll come out with a well-rounded iOS skillset, not just "I built a CRUD app"

## Ground Rules

1. **Keep the web app running as production** while building iOS alongside it. The edge functions serve both — zero migration risk.
2. **No backend changes needed.** The Supabase REST API and edge functions are already the contract. Swift just becomes another client.
3. **Separate repo, sibling folder.** The iOS app lives in its own directory alongside the web app — different toolchain, different deploy, shared backend:
   ```
   ~/CascadeProjects/
   ├── health-vision/          # Existing web app (React + Supabase)
   └── health-vision-ios/      # New iOS app (SwiftUI) — own git repo
   ```
4. **Admin stays on web.** It's complex, rarely used, and not worth porting. Consider a `WKWebView` wrapper if you need it on mobile at all.

---

## Learning Approach

This is a first iOS app — the build process is explicitly educational.

### Principles

1. **Explain, don't just implement.** Every new iOS concept gets a brief "why it works this way" explanation — not just working code. React analogies where helpful (e.g., `@State` ≈ `useState`, `@Observable` ≈ context/store, `NavigationStack` ≈ React Router).

2. **System components first, customize second.** Apple's built-in controls (buttons, lists, forms, navigation bars, tab bars, sheets, alerts) give you:
   - Accessibility for free (VoiceOver, Dynamic Type, reduce motion)
   - Consistency with every other app on the user's phone
   - Automatic adaptation to dark mode, platform updates, new devices
   - Less code to maintain

   **When to go custom:** When the default component can't express the interaction you need (e.g., a habit completion ring, a weekly calendar grid, a challenge progress timeline). Even then, compose from system primitives where possible.

3. **Prototype interactions, don't assume.** iOS has multiple valid patterns for common tasks. We'll build small prototypes to compare:

   | Decision | Options to try | How to decide |
   |----------|---------------|---------------|
   | Completing a habit | Tap row toggle vs swipe action vs long-press menu | Which feels fastest for daily use? |
   | Adding a habit | Push to new screen vs sheet vs inline expansion | How much context does the user need? |
   | Navigation model | Tab bar (standard) vs sidebar (iPad-ready) | Device targets + content hierarchy |
   | Reflection entry | Full-screen editor vs inline card vs sheet | How much writing space is needed? |
   | Destructive actions | Swipe-to-delete vs edit mode vs confirmation sheet | How reversible is the action? |

4. **Human Interface Guidelines (HIG) as guardrails.** Apple's [HIG](https://developer.apple.com/design/human-interface-guidelines/) isn't just suggestions — App Store reviewers check for compliance, and users notice when apps feel "off." Key HIG principles we'll follow:
   - **Clarity** — text is legible, icons are precise, UI elements are recognizable
   - **Deference** — content is the focus, not chrome
   - **Depth** — visual layers and motion convey hierarchy
   - Use standard gestures for their expected purpose (don't repurpose swipe-back)
   - Respect Safe Area, Dynamic Type, and system spacing

### React → SwiftUI Mental Model

| React Concept | SwiftUI Equivalent | Key Difference |
|--------------|-------------------|----------------|
| `useState` | `@State` | Value types, not reference; triggers view re-render |
| `useContext` / Redux | `@Observable` + `.environment()` | No provider wrapping needed; observation is automatic |
| `useEffect` | `.task {}` / `.onChange()` | `.task` auto-cancels when view disappears |
| `props` | View initializer params | Views are structs, not classes — cheap to create |
| React Router | `NavigationStack` + `NavigationLink` | Stack-based, not route-string-based |
| `<div>` / `<span>` | `VStack` / `HStack` / `ZStack` | No CSS — layout is declarative composition |
| Tailwind classes | ViewModifiers (`.padding()`, `.font()`) | Chained, order matters (unlike CSS) |
| `fetch()` / axios | `URLSession` or Supabase SDK | Built-in, no dependencies needed |
| `children` / slots | `@ViewBuilder` closures | Type-safe, compile-time checked |
| CSS animations | `.animation()` / `withAnimation {}` | Implicit animations — declare the end state, SwiftUI animates the diff |

### Design System Strategy

Your web app has `@summit/design-system` (Tailwind + CVA). For iOS:

**Phase 1 (learning):** Use 100% system components. Learn how `List`, `Form`, `Button`, `NavigationStack`, `TabView`, `.sheet()`, `.alert()` behave. Get comfortable with the defaults.

**Phase 2 (customization):** Create a thin `SummitUI` layer for brand consistency:
- Color tokens (`.summitGreen`, `.summitBackground`) as a `Color` extension
- Typography scale (`.summitHeadline`, `.summitBody`) as `Font` extension
- A few custom components where system ones fall short (completion ring, streak badge, habit card)

**Phase 3 (polish):** Decide per-component whether to keep system default or customize:
- System `List` rows? Or custom `HabitRow` cards?
- System `TabView`? Or custom tab bar with animations?
- Default `NavigationTitle`? Or branded header?

For each decision, we'll put both options side-by-side on device so you can feel the difference. Often the system component wins — it's familiar, accessible, and maintained by Apple.

---

## Architecture Overview

```
┌──────────────────────────────────┐
│  SwiftUI App                     │
│  ┌────────────┐ ┌──────────────┐ │
│  │   Views     │ │  ViewModels  │ │
│  │  (screens)  │ │  @Observable │ │
│  └─────┬──────┘ └──────┬───────┘ │
│        │               │         │
│  ┌─────▼───────────────▼───────┐ │
│  │     Service Layer           │ │
│  │  (Swift structs/actors)     │ │
│  └─────────────┬───────────────┘ │
│                │                 │
│  ┌─────────────▼───────────────┐ │
│  │  SupabaseClient (SDK)       │ │
│  │  + URLSession (edge funcs)  │ │
│  └─────────────────────────────┘ │
└──────────────────────────────────┘
         │
         ▼
  Supabase (Postgres + Auth + Edge Functions)
  Stripe · Twilio · OpenAI (unchanged)
```

### Key Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| Supabase SDK | [`supabase-swift`](https://github.com/supabase/supabase-swift) | Auth, Realtime, PostgREST, Storage |
| Payments | RevenueCat **or** Stripe iOS SDK | RevenueCat simplifies Apple IAP + existing Stripe; see Payments section |
| Analytics | PostHog iOS SDK | Drop-in replacement for web PostHog |
| Keychain | Built-in (via supabase-swift) | Token persistence handled by SDK |
| Notifications | UserNotifications + APNs | Replace SMS reminders on-device |

---

## Build Order (also the learning path)

### Phase 1: Auth + Navigation Skeleton
**Concepts you'll learn:** Swift concurrency (`async/await`), `@Observable` / `@State`, `NavigationStack`, Supabase Swift SDK setup.

**Tasks:**
- [ ] Create Xcode project (iOS 17+ target, SwiftUI lifecycle)
- [ ] Add `supabase-swift` via SPM
- [ ] Create `SupabaseManager` singleton with anon key + URL
- [ ] Implement `AuthViewModel` — sign in with password, magic link, OAuth (Apple Sign-In is expected on iOS)
- [ ] Build the `Home.jsx` redirect tree in Swift:
  ```
  profile incomplete? → ProfileSetup
  phone not verified? → VerifyPhone
  lite user? → TechNeckStatus
  onboarding incomplete? → Start
  no subscription? → Pricing
  else → Dashboard
  ```
- [ ] Create navigation container with `TabView` (Dashboard, Habits, Reflection, Profile)
- [ ] Stub out empty views for each tab

**Supabase Swift auth pattern:**
```swift
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://your-project.supabase.co")!,
    supabaseKey: "your-anon-key"
)

// Sign in
try await supabase.auth.signIn(email: email, password: password)

// Listen for auth changes
for await (event, session) in supabase.auth.authStateChanges {
    // update app state
}
```

### Phase 2: Service Layer
**Concepts you'll learn:** Swift's type system (Codable structs), actors for thread safety, generics, error handling with `Result` and `throws`.

**Tasks:**
- [ ] Define `Codable` models for every table (mirror your JS service layer):
  ```swift
  struct Profile: Codable, Identifiable {
      let id: UUID
      var firstName: String?
      var lastName: String?
      var email: String?
      var phone: String?
      var timezone: String
      var smsOptIn: Bool
      var subscriptionStatus: String?
      var challengeType: String?
      // ... etc
  }

  struct WeeklyHabit: Codable, Identifiable {
      let id: UUID
      let userId: UUID
      var habitName: String
      var dayOfWeek: Int // 0-6
      var reminderTime: String
      var timezone: String
      var challengeSlug: String?
  }
  ```
- [ ] Port each JS service to a Swift struct:
  | JS Service | Swift Service | Priority |
  |------------|---------------|----------|
  | `authService.js` | `AuthService` | P0 |
  | `habitService.js` | `HabitService` | P0 |
  | `trackingService.js` | `TrackingService` | P0 |
  | `subscriptionService.js` | `SubscriptionService` | P0 |
  | `challengeService.js` | `ChallengeService` | P1 |
  | `reflectionService.js` | `ReflectionService` | P1 |
  | `journeyService.js` | `JourneyService` | P1 |
  | `resourceService.js` | `ResourceService` | P2 |
  | `adminService.js` | Skip (web only) | — |

- [ ] Service pattern (mirrors your JS pattern):
  ```swift
  struct HabitService {
      static func getHabits() async throws -> [WeeklyHabit] {
          let response: [WeeklyHabit] = try await supabase
              .from("weekly_habits")
              .select()
              .eq("user_id", value: supabase.auth.session?.user.id)
              .execute()
              .value
          return response
      }

      static func saveHabit(_ habit: WeeklyHabit) async throws {
          try await supabase
              .from("weekly_habits")
              .upsert(habit)
              .execute()
      }
  }
  ```

### Phase 3: Core Screens
**Concepts you'll learn:** Lists, forms, sheets, custom components, `@Observable` view models, pull-to-refresh, swipe actions, animations.

**Screens to build (in order):**

| Screen | React Source | SwiftUI Notes |
|--------|-------------|---------------|
| **Dashboard** | `Dashboard.jsx` / `DashboardSummit.jsx` | `ScrollView` + cards; habit completion ring |
| **Habits List** | `Habits.jsx` | `List` with swipe-to-delete; `NavigationLink` to detail |
| **Add Habit** | `AddHabit.jsx` | `Form` with `Picker` for days, `DatePicker` for time |
| **Schedule Habits** | `ScheduleHabits.jsx` | Multi-day picker grid |
| **Habit Tracking** | (tracking entries) | Toggle/slider per habit; `entry_source: 'app'` |
| **Reflection** | `Reflection.jsx` | `TextEditor` for journal entries; challenge modal |
| **Profile** | `Profile.jsx` | Settings form; subscription info; sign out |
| **Profile Setup** | `ProfileSetup.jsx` | Onboarding flow with `TabView` pages |
| **Vision Builder** | `Vision.jsx` | Multi-step form; health journey creation |

**Dashboard habit ring example:**
```swift
struct HabitCompletionRing: View {
    let completed: Int
    let total: Int

    var progress: Double {
        guard total > 0 else { return 0 }
        return Double(completed) / Double(total)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.gray.opacity(0.2), lineWidth: 8)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.green, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.spring, value: progress)
            Text("\(completed)/\(total)")
                .font(.headline)
        }
    }
}
```

### Phase 4: Challenges
**Concepts you'll learn:** Complex navigation, state machines, JSONB ↔ Swift Codable.

**Tasks:**
- [ ] Port `challengeConfig.js` → `ChallengeConfig.swift` (same hardcoded data)
- [ ] `ChallengesLanding` — grid of 5 challenge cards
- [ ] `ChallengeDetail` — week-by-week progress, current focus area
- [ ] `ChallengeAddHabit` — select habit from focus area suggestions
- [ ] Reflection → challenge modal (next week prompt or completion)
- [ ] Lite challenge status view (`TechNeckStatus`)

### Phase 5: Notifications + Widgets
**Concepts you'll learn:** `UserNotifications`, `UNNotificationRequest`, WidgetKit, `TimelineProvider`, App Intents.

This is the iOS-native payoff — features that are **better** than web.

**Local Notifications (replace SMS reminders on-device):**
```swift
func scheduleHabitReminder(habit: WeeklyHabit) {
    let content = UNMutableNotificationContent()
    content.title = "Time for your habit"
    content.body = habit.habitName
    content.sound = .default

    var dateComponents = DateComponents()
    dateComponents.weekday = habit.dayOfWeek + 1 // iOS: 1=Sun
    let timeParts = habit.reminderTime.split(separator: ":")
    dateComponents.hour = Int(timeParts[0])
    dateComponents.minute = Int(timeParts[1])

    let trigger = UNCalendarNotificationTrigger(
        dateMatching: dateComponents, repeats: true
    )

    let request = UNNotificationRequest(
        identifier: "habit-\(habit.id)",
        content: content,
        trigger: trigger
    )

    UNUserNotificationCenter.current().add(request)
}
```

**Widgets:**
- Habit completion ring (small widget)
- Today's habits checklist (medium widget)
- Weekly streak (lock screen inline)
- Interactive toggle widget (iOS 17+) — mark habits complete from home screen

### Phase 6: iOS-Only Enhancements
Things you can do on iOS that the web app can't:

- [ ] **Apple Sign-In** — required by App Store if you offer any social auth
- [ ] **HealthKit integration** — read step count, sleep data, heart rate to auto-complete metric habits
- [ ] **Haptic feedback** — satisfying taps when completing habits
- [ ] **Shortcuts/Siri** — "Hey Siri, log my morning walk"
- [ ] **Focus Filters** — show relevant habits during specific Focus modes
- [ ] **Live Activities** — show current habit streak on lock screen during the day

---

## Payments: Stripe vs Apple IAP

**Important decision.** Apple requires IAP for digital subscriptions sold in-app (30% cut). Options:

| Approach | Pros | Cons |
|----------|------|------|
| **RevenueCat + keep Stripe for web** | Handles IAP complexity; syncs with existing Stripe; one dashboard | 30% Apple cut on iOS purchases; monthly RevenueCat fee at scale |
| **Stripe only (web checkout)** | Keep your existing flow; 0% Apple cut | Must open Safari for checkout; slightly worse UX |
| **Reader rule (link out)** | Can link to web for subscriptions (US, post-2024) | Still can't do in-app purchase UI; limited to a single external link |

**Recommendation:** Start with **Stripe web checkout** (open Safari → existing checkout flow → deep link back). It works today with zero new infrastructure. Add RevenueCat later if the App Store review pushes back or you want native IAP UX.

---

## Data Models — Swift Codable Reference

These map 1:1 to your Postgres tables. The Supabase Swift SDK handles `snake_case` ↔ `camelCase` conversion via a custom `JSONDecoder`.

```swift
// Configure Supabase client with snake_case decoding
// (supabase-swift does this by default)

struct Profile: Codable, Identifiable {
    let id: UUID
    var firstName: String?
    var lastName: String?
    var email: String?
    var phone: String?
    var timezone: String
    var profileCompleted: Bool
    var onboardingCompleted: Bool
    var phoneVerified: Bool
    var smsOptIn: Bool
    var trackingFollowupTime: String?  // "17:00"
    var stripeCustomerId: String?
    var stripeSubscriptionId: String?
    var subscriptionStatus: String?    // active, trialing, canceled, etc.
    var subscriptionTier: String?      // core, plus, premium
    var trialEndsAt: Date?
    var subscriptionCurrentPeriodEnd: Date?
    var challengeType: String?         // "lite" or nil
    var deletedAt: Date?
}

struct WeeklyHabit: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var habitName: String
    var dayOfWeek: Int
    var reminderTime: String
    var timezone: String
    var timeOfDay: String?
    var challengeSlug: String?
}

struct HabitTrackingConfig: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var habitName: String
    var trackingType: String       // "boolean" or "metric"
    var metricUnit: String?
    var metricTarget: Double?
    var challengeSlug: String?
    var trackingEnabled: Bool
}

struct HabitTrackingEntry: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var habitName: String
    var entryDate: String          // "2026-03-31"
    var completed: Bool?
    var metricValue: Double?
    var entrySource: String?       // "app" or "sms"
}

struct WeeklyReflection: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var weekNumber: Int
    var wentWell: String?
    var friction: String?
    var adjustment: String?
    var appFeedback: String?
    var source: String?            // "web", "sms", or "app"
}

struct HealthJourney: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var formData: [String: AnyCodable]  // JSONB — use AnyCodable or custom type
}

struct ChallengeEnrollment: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    var challengeSlug: String
    var status: String             // active, completed, abandoned
    var currentWeek: Int           // 1-4
    var surveyScores: [String: AnyCodable]?
}

struct SMSMessage: Codable, Identifiable {
    let id: UUID
    var direction: String          // "inbound" or "outbound"
    var userId: UUID?
    var phone: String?
    var body: String?
    var sentByType: String?
    var createdAt: Date?
}
```

---

## Edge Function Calls from Swift

For edge functions that aren't simple PostgREST queries, call them via `URLSession`:

```swift
struct EdgeFunctionClient {
    static func call<T: Decodable>(
        _ functionName: String,
        body: Encodable? = nil
    ) async throws -> T {
        let url = URL(string: "\(supabaseURL)/functions/v1/\(functionName)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw EdgeFunctionError.httpError(response)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}

// Usage
let session: CheckoutResponse = try await EdgeFunctionClient.call(
    "create-checkout-session",
    body: CheckoutRequest(priceId: priceId, mode: "subscription")
)
```

**Functions you'll call from iOS:**
| Function | When |
|----------|------|
| `create-checkout-session` | Pricing screen → opens Safari |
| `create-portal-session` | Profile → Manage Subscription |
| `send-phone-verification` | Phone verification screen |
| `verify-phone-code` | OTP entry |
| `ai-chat` | Coaching screen |
| `habit-ai-suggest` | Add habit flow |
| `create-lite-enrollment` | Tech Neck signup |

Functions you do NOT call from iOS (they're cron/webhook/internal):
All SMS functions, webhook handlers, email senders, digest generators, admin tools.

---

## Project Structure

```
~/CascadeProjects/health-vision-ios/
└── SummitHealth/
├── SummitHealthApp.swift           # App entry point
├── Info.plist
├── Assets.xcassets/
├── Models/                         # Codable structs
│   ├── Profile.swift
│   ├── WeeklyHabit.swift
│   ├── HabitTrackingEntry.swift
│   ├── WeeklyReflection.swift
│   ├── ChallengeEnrollment.swift
│   └── ChallengeConfig.swift       # Hardcoded challenge data
├── Services/                       # Data layer (Supabase queries)
│   ├── SupabaseManager.swift       # Client singleton
│   ├── AuthService.swift
│   ├── HabitService.swift
│   ├── TrackingService.swift
│   ├── SubscriptionService.swift
│   ├── ChallengeService.swift
│   ├── ReflectionService.swift
│   ├── JourneyService.swift
│   └── EdgeFunctionClient.swift    # Generic edge function caller
├── ViewModels/                     # @Observable view models
│   ├── AuthViewModel.swift
│   ├── DashboardViewModel.swift
│   ├── HabitsViewModel.swift
│   ├── TrackingViewModel.swift
│   ├── ReflectionViewModel.swift
│   └── ChallengeViewModel.swift
├── Views/                          # SwiftUI views
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   ├── ProfileSetupView.swift
│   │   └── VerifyPhoneView.swift
│   ├── Onboarding/
│   │   ├── StartView.swift
│   │   └── VisionView.swift
│   ├── Dashboard/
│   │   └── DashboardView.swift
│   ├── Habits/
│   │   ├── HabitsListView.swift
│   │   ├── AddHabitView.swift
│   │   └── ScheduleHabitsView.swift
│   ├── Tracking/
│   │   └── HabitTrackingView.swift
│   ├── Reflection/
│   │   └── ReflectionView.swift
│   ├── Challenges/
│   │   ├── ChallengesLandingView.swift
│   │   ├── ChallengeDetailView.swift
│   │   └── ChallengeAddHabitView.swift
│   ├── Profile/
│   │   ├── ProfileView.swift
│   │   └── PricingView.swift
│   ├── Coaching/
│   │   └── CoachingView.swift
│   └── Shared/
│       ├── HabitCompletionRing.swift
│       └── LoadingView.swift
├── Navigation/
│   ├── ContentView.swift           # Root: auth check → tab or login
│   ├── MainTabView.swift           # TabView container
│   └── HomeRouter.swift            # Port of Home.jsx redirect tree
├── Notifications/
│   └── NotificationManager.swift   # Local notification scheduling
├── Widgets/                        # WidgetKit extension target
│   ├── HabitWidget.swift
│   └── StreakWidget.swift
└── Extensions/
    └── Date+Helpers.swift
```

---

## Minimum Viable Build (get something on your phone)

If you want the fastest path to a working app on your device:

1. `SummitHealthApp.swift` → `SupabaseManager` → `AuthViewModel` → `LoginView`
2. Sign in with existing credentials
3. `HabitService.getHabits()` → display in a `List`
4. Toggle a habit complete → writes to `habit_tracking_entries`

That's ~4-5 files and you have a functional app that talks to your real backend. Everything else layers on from there.

---

## What Stays on Web

| Feature | Why |
|---------|-----|
| Admin dashboard | Complex, rarely used, not worth the port |
| Bulk SMS/email sending | Admin-only |
| Cron job management | Supabase dashboard |
| Detailed SMS thread viewer | Nice-to-have later; start read-only |

---

## iOS-Specific Gotchas

1. **Apple Sign-In is mandatory** if you offer any third-party auth (Google, etc.). Add it early.
2. **App Store subscription rules** — digital content subscriptions must use IAP (30% cut) unless you qualify for the reader rule or small business program (15%).
3. **Background refresh** — iOS severely limits background execution. Don't rely on it for timely habit reminders; use `UNNotificationRequest` with calendar triggers instead.
4. **Keychain persistence** — `supabase-swift` stores tokens in Keychain by default. Tokens survive app deletion on iOS 16+ (intentional by Apple).
5. **Deep links** — you'll need these for Stripe checkout return (`summithealth://subscription/success`) and magic link auth. Set up Universal Links via `apple-app-site-association` on your domain.
6. **PKCE flow works natively** — unlike the web gotcha, `supabase-swift` handles PKCE correctly out of the box. Magic links will work.
7. **Timezone** — use `TimeZone.current.identifier` (returns IANA format like "America/Chicago") which matches your existing `timezone` column.

---

## Timeline Expectations

This is a learning project — don't put dates on it. But here's the rough ordering of effort:

| Phase | What you'll have |
|-------|-----------------|
| Phase 1 | App that authenticates and navigates |
| Phase 2 | App that reads/writes all your data |
| Phase 3 | Usable daily driver for habit tracking |
| Phase 4 | Full feature parity with challenges |
| Phase 5 | Better-than-web with widgets + notifications |
| Phase 6 | Polished, App Store-ready |

Phase 3 is the "daily driver" milestone — once you're there, you'll be using your own app every day, which is the best motivator to keep building.
