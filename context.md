# CONTEXT DOCUMENT FOR "Golf Insight" APP

## 1. Problem We're Solving
• Amateur and casual golfers record total strokes but lack **hole-by-hole**, **par-relative** feedback on shot quality (drive, iron, chip, putt).  
• They want actionable, targeted practice advice but existing apps either over-complicate entry or only track raw scores.

## 2. Key User Personas
• **Weekend Warrior** – Plays 1–2×/month, wants simple insights to shave 5 strokes off a round.  
• **Club Competitor** – Plays weekly, needs data-driven practice priorities (e.g., approach accuracy on par-4s).  
• **Beginner** – Learning fundamentals, craves immediate "Good/Bad/Fair" feedback to build habits.

## 3. Target Market
• 20–50 year-old golfers in core markets (US, UK, Australia).  
• Already use mobile apps for tracking their golf rounds; open to adding performance tracking. Keen to improve their golf.

## 4. Core Value Propositions
• **Ease of tracking** – Tap once per shot type per hole, even offline.  
• **Par-Relative Insights** – See "+2 on par-5s" over last rounds.  
• **Actionable Feedback** – Personal AI-driven tips (e.g., "Practice chips from 15 yd").

## 5. Current Technical Architecture
• **Frontend:** React Native + Expo (~52.0.40), React Navigation 7.x, React Native Paper 4.9.2
• **Backend:** Supabase (Auth + PostgreSQL with RLS), RevenueCat (subscriptions), PostHog (analytics)
• **Subscription Model:** Free tier (basic tracking) + Premium tier ($9.99/month for AI insights)
• **Data Flow:**
  – AuthContext manages user state + RevenueCat permissions
  – Webhook processes subscription events → updates user_permissions table
  – Offline-first shot tracking with batch sync

## 6. Current App State
• **9 Active Screens:** Home, Tracker, Insights (Premium), Profile, Course Selector, Auth, Verification, Scorecard, Round Screen
• **Navigation:** Tab navigator (Home, Tracker, Insights, Profile) with stack navigators
• **Database Schema:** golf_rounds, user_permissions, profiles tables with RLS
• **External APIs:** Course data API with local caching, RevenueCat webhook integration

## 7. Key Business Logic
• **Shot Tracking:** JSON arrays in golf_rounds.shots with par-relative analysis
• **Premium Gating:** hasPermission("product_a") checks for Insights access
• **Handicap System:** Current + target handicap with improvement tracking
• **Subscription Lifecycle:** RevenueCat → Webhook → Database → AuthContext refresh

## 8. Current Technical Priorities
• **Immediate:** Fix subscription expiration handling, add restore purchases functionality
• **Next:** Real-time permission refresh, enhanced subscription management UI

## 9. Folder & File Structure
```
/src
  /screens
    AuthScreen.js
    HomeScreen.js
    CourseSelectorScreen.js
    TrackerScreen.js
    ScorecardScreen.js
    ProfileScreen.js (with account deletion)
    InsightsScreen.js (Premium)
    RoundScreen.js
    VerificationPendingScreen.js
  /navigation
    AppNavigator.js
    MainNavigator.js
    HomeStack.js
  /context
    AuthContext.js (with RevenueCat integration)
  /services
    supabase.js
    purchaseService.js
    analyticsService.js
    courseService.js
    insightsService.js
    roundservice.js
  /components
    PremiumButton.js
    DistanceIndicator.js
    HoleNavigator.js
    InsightCard.js
    RoundSummaryCard.js
    ShotTable.js
    SkeletonCourseCard.js
    InsightsSummaryCard.js
  /ui
    theme.js
    Layout.js
    headerConfig.js
    /components
      Button.js
      Card.js
      Loading.js
      Typography.js
  /hook
    useSwipegesture.js
/supabase
  /functions
    revenuecat-webhook (handles subscription lifecycle)
    analyze-golf-performance (AI insights generation)
    get-courses (external API integration)
    get-course-details
    get-course-detailed-info
    process-purchase
  /docs
    auth_meta.md
    db_data_structure_examples.md
    db_schema.md
  config.toml
```

## 10. Development Philosophy
• **Intelligent Tech-Lead Mindset:** Apply industry best practices—clean architecture, SOLID principles, clear separation of concerns.  
• **Backend-Strong:** Prioritize secure data models, RLS policies, and robust error handling.  
• **Risk-Averse:** Do not write significant code without full context—ask clarifying questions first.  
• **Context-Driven:** Understand the "why" behind features before implementation; document assumptions and highlight open questions.  
• **Collaborative & Inquisitive:** If any requirement is ambiguous, pause and request details rather than guessing.

## 11. UI/UX Philosophy
• **Strong Design System:** Build reusable, themeable components (buttons, cards, inputs) consistent across screens.  
• **Native-Feel & Premium:** Prioritize iOS design patterns (smooth gestures, standard spacing, native typography) while maintaining cross-platform consistency.  
• **Leverage Standard Libraries:** Use React Native Paper, React Native Elements, or built-in components—avoid custom implementations unless absolutely necessary.  
• **Reusability & Modularity:** Extract common UI patterns into shared components; follow atomic design principles.  
• **Accessibility & Performance:** Ensure high contrast, proper touch targets, and minimal re-renders for smooth UX even on lower-end devices.

## 12. Revenue & Growth Context
• **Monetization:** Premium subscription model via RevenueCat ($9.99/month)
• **Key Metrics:** User retention, premium conversion rate, feature engagement via PostHog
• **Growth:** App Store optimization, word-of-mouth, golf community integration
• **Free vs Premium:** Free users get basic tracking, Premium gets AI insights and advanced analytics

## 13. Critical User Flows
• **Onboarding:** Email signup → verification (deep link) → permission loading → main app
• **Round Entry:** Course selection → hole-by-hole tracking → summary → insights (insights are Premium)
• **Premium Upgrade:** Insights paywall or Profile Screen → RevenueCat purchase → webhook processing → access granted
• **Data Sync:** Offline-first → batch sync → real-time updates
• **Account Management:** Profile screen → subscription management → account deletion (App Store compliance)

## 14. Known Technical Debt & Issues
• **Profile Screen:** Lacks real-time subscription refresh when returning from background
• **Restore Purchases:** Service exists but no UI button exposed to users
• **Webhook Issues:** Subscription expiration events may not be processing correctly
• **Permission Refresh:** Only updates on auth state changes, not on screen focus
• **Error Boundaries:** Missing comprehensive error boundary implementation

## 15. Security & Privacy
• **Data Protection:** Supabase RLS ensures users only access their own data
• **RevenueCat Integration:** User ID consistency between Supabase and RevenueCat required
• **Account Deletion:** Compliant with App Store guidelines, includes confirmation flow
• **Webhook Security:** Authorization header validation for RevenueCat webhook calls
• **Analytics:** PostHog configured with EU server for privacy compliance

## 16. API Integration Patterns
• **RevenueCat:** User ID must match Supabase user ID for proper permission sync
• **Course API:** Cache locally, handle API failures gracefully, batch requests
• **Supabase:** Use RLS for all user data access, handle auth state changes
• **PostHog:** Track user events for product analytics, respect privacy settings
• **Webhook Processing:** Handle all subscription lifecycle events (purchase, renewal, cancellation, expiration)

## 17. What to Do with This Context
• Use it to **interpret** any request ("Add feature X", "Fix bug Y") with full awareness of users, flows, data model, and design guidelines.
• Ensure any UI/UX suggestions respect one-tap simplicity, offline resilience, and the premium native feel.
• When adding new screens or services, follow the existing folder structure, context usage, and style conventions.
• Preserve RLS security—never expose another user's rounds or shots.
• Raise questions when requirements or designs are unclear—don't proceed on assumptions.
• Always consider the subscription model impact when adding new features.
• Test RevenueCat integration thoroughly, especially webhook processing.
• Maintain consistency with existing React Native Paper components and theme system.

---

**End of Context Document**

This document provides the complete context needed to understand the Golf Insight app architecture, user needs, technical implementation, and development priorities. Reference this when working on any feature or bug fix to ensure alignment with the app's vision and technical standards.