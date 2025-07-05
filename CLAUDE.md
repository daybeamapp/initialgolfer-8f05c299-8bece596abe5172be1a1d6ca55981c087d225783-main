# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Basic Commands
- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser

### Testing and Validation
- No specific test or lint commands configured - check with user before running tests
- Always run `npm start` to verify changes work in development

## Architecture Overview

### Tech Stack
- **Frontend**: React Native with Expo (~52.0.40)
- **Navigation**: React Navigation 7.x with Stack and Tab navigators
- **Backend**: Supabase (PostgreSQL database + Edge Functions)
- **Authentication**: Supabase Auth with email verification
- **Payments**: RevenueCat integration for subscription management
- **Analytics**: PostHog for user analytics
- **State Management**: React Context API

### Core Architecture Patterns

#### Authentication Flow
- `AuthContext` manages user state, permissions, and RevenueCat initialization
- Three-tier navigation: `AppNavigator` → `MainNavigator` → Screen-specific stacks
- Email verification required before accessing main app
- Deep linking support for email verification callbacks

#### Subscription Management
- RevenueCat handles subscription purchases and validation
- Webhook at `supabase/functions/revenuecat-webhook/index.ts` processes subscription events
- User permissions stored in `user_permissions` table with RevenueCat integration
- Premium features gated by `hasPermission("product_a")` check

#### Data Flow
1. **Authentication**: Supabase Auth → AuthContext → UI updates
2. **Purchases**: RevenueCat → Webhook → Database → AuthContext refresh
3. **Golf Data**: Supabase direct queries → Screen state → UI

### Key Components

#### Navigation Structure
- `AppNavigator`: Root navigator (Auth vs Main app)
- `MainNavigator`: Tab navigator with 4 tabs (Home, Tracker, Insights, Profile)
- `HomeStack`: Stack navigator for home-related screens

#### Core Services
- `supabase.js`: Database client configuration
- `purchaseService.js`: RevenueCat integration and purchase handling
- `AuthContext.js`: Authentication state management and user permissions

#### Premium Features
- Insights screen requires `product_a` permission
- `PremiumButton` component handles subscription purchases
- Profile screen shows subscription status and management options

### Database Schema

#### Key Tables
- `profiles`: User profile data with handicap tracking
- `user_permissions`: RevenueCat integration for subscription permissions
- `golf_rounds`: Round data with JSON shot tracking
- `golf_courses`: Course information from external API

#### Supabase Functions
- `revenuecat-webhook`: Processes subscription lifecycle events
- `analyze-golf-performance`: Generates AI-powered golf insights
- `get-courses`: Fetches course data from external API

### Important Implementation Details

#### RevenueCat Integration
- User ID must match between Supabase and RevenueCat
- Webhook handles all subscription events (purchase, renewal, cancellation, expiration)
- Permissions are cached in AuthContext and refreshed on auth state changes

#### Golf Data Structure
- Shots stored as JSON arrays in `golf_rounds.shots`
- Course data fetched from external API and cached locally
- Handicap tracking with target handicap functionality

#### Error Handling
- RevenueCat initialization is non-blocking (app continues if purchases fail)
- Graceful degradation for premium features when user lacks permissions
- Comprehensive error logging for debugging

### Development Guidelines

#### When Working with Subscriptions
- Always test webhook integration in development environment
- Verify user permissions refresh after subscription changes
- Check both active subscription status and expiration dates

#### When Working with Golf Data
- Validate shot data structure before saving to database
- Handle missing course data gracefully
- Ensure handicap calculations follow golf standards

#### When Working with UI
- Use existing `theme.js` for consistent styling
- Leverage reusable components in `src/ui/components/`
- Follow established navigation patterns

### Common Issues

#### RevenueCat Not Initializing
- Check user ID consistency between Supabase and RevenueCat
- Verify RevenueCat API keys are properly configured
- Ensure app continues to function without RevenueCat (non-blocking)

#### Permission Refresh Issues
- User permissions only refresh on auth state changes
- No automatic refresh when returning to screens
- Consider implementing focus-based permission refresh for real-time updates

#### Database Connection Issues
- Verify Supabase URL and anon key are correct
- Check RLS policies for proper data access
- Ensure user is authenticated before database operations

### Security Considerations
- Supabase RLS policies protect user data
- RevenueCat webhook uses authorization header validation
- User permissions verified server-side via webhook integration
- Account deletion functionality implemented with proper confirmation flow