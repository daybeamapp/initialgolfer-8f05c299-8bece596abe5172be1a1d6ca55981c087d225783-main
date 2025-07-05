// supabase/functions/revenuecat-webhook/index.ts
//
// Industry Standard RevenueCat Webhook Handler
// Implements Authorization header authentication aligned with RevenueCat best practices
// Processes both SANDBOX and PRODUCTION environments for comprehensive testing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

// Define payload type for request validation
interface RequestPayload {
  api_version: string;
  event: {
    type: string;
    id: string;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    environment: string;
    expiration_at_ms: number | null;
    transaction_id: string;
    store: string;
  };
}

// Event types processed by this webhook handler
enum EventType {
  INITIAL_PURCHASE = "INITIAL_PURCHASE",
  RENEWAL = "RENEWAL", 
  CANCELLATION = "CANCELLATION",
  EXPIRATION = "EXPIRATION",
  PRODUCT_CHANGE = "PRODUCT_CHANGE",
  BILLING_ISSUE = "BILLING_ISSUE",
  NON_RENEWING_PURCHASE = "NON_RENEWING_PURCHASE"
}

/**
 * Industry Standard RevenueCat Webhook Handler
 * 
 * Implements RevenueCat's recommended Authorization header authentication
 * approach with comprehensive event processing for subscription lifecycle management.
 * 
 * Architecture Features:
 * - Simple Authorization header validation (industry standard)
 * - Both SANDBOX and PRODUCTION event processing
 * - Comprehensive error handling and retry resilience
 * - Idempotent permission management
 */
serve(async (req) => {
  // CORS handling for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  // Only allow POST method for webhook events
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("RevenueCat webhook received - processing with industry standard authentication");
    
    // Industry Standard Authorization Header Validation
    const authHeader = req.headers.get("Authorization");
    const EXPECTED_AUTH = Deno.env.get("REVENUECAT_AUTH_HEADER");
    
    if (!EXPECTED_AUTH) {
      console.error("REVENUECAT_AUTH_HEADER environment variable not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (!authHeader || authHeader !== EXPECTED_AUTH) {
      console.error("Authorization validation failed:", {
        received: authHeader ? "***REDACTED***" : "null",
        expected: "***CONFIGURED***"
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log("✓ Authorization validated successfully");
    
    // Create Supabase client with admin access for permission management
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse event payload
    const eventPayload: RequestPayload = await req.json();
    const eventData = eventPayload.event;
    
    console.log(`Processing ${eventData.environment} event:`, {
      type: eventData.type,
      user_id: eventData.original_app_user_id,
      product_id: eventData.product_id,
      environment: eventData.environment
    });
    
    // Extract core event information
    const userId = eventData.original_app_user_id;
    const eventType = eventData.type as EventType;
    const productId = eventData.product_id;
    const environment = eventData.environment;
    const expirationMs = eventData.expiration_at_ms;
    const transactionId = eventData.transaction_id;
    const store = eventData.store.toLowerCase();
    
    // Determine entitlement ID - use first entitlement or derive from product
    const entitlementId = eventData.entitlement_ids?.[0] || "product_a";
    
    // Process event based on type
    switch (eventType) {
      case EventType.INITIAL_PURCHASE:
      case EventType.RENEWAL:
      case EventType.NON_RENEWING_PURCHASE:
        // New subscription or renewal - activate permission
        await handleSubscriptionActivation(
          supabase,
          userId,
          entitlementId,
          productId,
          store,
          expirationMs ? new Date(expirationMs) : null,
          transactionId,
          environment
        );
        break;
        
      case EventType.CANCELLATION:
        // User cancelled but maintains access until expiration
        await handleSubscriptionCancellation(
          supabase,
          userId,
          entitlementId,
          expirationMs ? new Date(expirationMs) : null
        );
        break;
        
      case EventType.EXPIRATION:
        // Access has expired - disable permission
        await handleSubscriptionExpiration(
          supabase,
          userId,
          entitlementId
        );
        break;
        
      case EventType.PRODUCT_CHANGE:
        // User changed subscription tier - update with new details
        await handleSubscriptionActivation(
          supabase,
          userId,
          entitlementId,
          productId,
          store,
          expirationMs ? new Date(expirationMs) : null,
          transactionId,
          environment
        );
        break;
        
      case EventType.BILLING_ISSUE:
        // Payment failed - flag but maintain access during grace period
        await handleBillingIssue(
          supabase,
          userId,
          entitlementId
        );
        break;
        
      default:
        console.log("Unhandled event type:", eventType);
        // Return success for unknown events to prevent retry loops
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        status: "processed",
        event_type: eventType,
        environment: environment,
        user_id: userId
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error processing RevenueCat webhook:", error);
    
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: "Server error processing webhook"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Handle subscription activation events (purchases, renewals, upgrades)
 * 
 * Creates or updates permission records with subscription details and expiration dates.
 * Implements idempotent processing to handle duplicate webhook deliveries gracefully.
 * 
 * @param supabase - Supabase client with admin permissions
 * @param userId - User's profile ID (original_app_user_id)
 * @param entitlementId - Entitlement identifier (maps to permission_id) 
 * @param productId - Platform-specific product identifier
 * @param platform - Store platform ('app_store' or 'play_store')
 * @param expiresAt - Subscription expiration date (null for non-renewing)
 * @param transactionId - Store transaction identifier
 * @param environment - SANDBOX or PRODUCTION
 */
async function handleSubscriptionActivation(
  supabase: any,
  userId: string,
  entitlementId: string,
  productId: string,
  platform: string,
  expiresAt: Date | null,
  transactionId: string,
  environment: string
) {
  try {
    const expirationString = expiresAt ? expiresAt.toISOString() : null;
    console.log(`Activating subscription for user ${userId}:`, {
      entitlement: entitlementId,
      expires: expirationString,
      environment
    });
    
    // Check if this is a new subscription (not just a renewal)
    const { data: existingPermission } = await supabase
      .from('user_permissions')
      .select('active, created_at')
      .eq('profile_id', userId)
      .eq('permission_id', entitlementId)
      .maybeSingle();
    
    const isNewSubscription = !existingPermission || !existingPermission.active;
    
    // Update or insert permission record with comprehensive metadata
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        profile_id: userId,
        permission_id: entitlementId,
        active: true,
        expires_at: expirationString,
        product_id: productId,
        platform: platform,
        revenuecat_user_id: userId,
        metadata: {
          transaction_id: transactionId,
          environment: environment,
          updated_at: new Date().toISOString(),
          status: 'active',
          source: 'revenuecat_webhook',
          event_processed_at: new Date().toISOString()
        }
      });
    
    if (error) {
      console.error("Error updating permission:", error);
      throw error;
    }
    
    console.log(`✓ Subscription activated for user ${userId}`);
    
    // Automatically generate premium insights for new product_a purchases
    if (entitlementId === 'product_a' && isNewSubscription) {
      console.log(`🎯 New product_a subscription detected - triggering automatic insights generation for user ${userId}`);
      // Call insights generation function (async, no await to avoid blocking webhook)
      triggerPremiumInsightsGeneration(userId);
    }
    
  } catch (error) {
    console.error("Error in handleSubscriptionActivation:", error);
    throw error;
  }
}

/**
 * Handle subscription cancellation events
 * 
 * Updates permission metadata to reflect cancellation while maintaining
 * access until the final expiration date.
 * 
 * @param supabase - Supabase client with admin permissions
 * @param userId - User's profile ID
 * @param entitlementId - Entitlement identifier
 * @param expiresAt - Final expiration date when access will be removed
 */
async function handleSubscriptionCancellation(
  supabase: any,
  userId: string,
  entitlementId: string,
  expiresAt: Date | null
) {
  try {
    const expirationString = expiresAt ? expiresAt.toISOString() : null;
    console.log(`Processing cancellation for user ${userId}, expires: ${expirationString}`);
    
    // Get existing record to preserve metadata
    const { data: existingPermission, error: fetchError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('profile_id', userId)
      .eq('permission_id', entitlementId)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Error fetching existing permission:", fetchError);
      throw fetchError;
    }
    
    // Prepare updated metadata
    const existingMetadata = existingPermission?.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      source: 'revenuecat_webhook'
    };
    
    // Update permission - maintain access until expiration
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        profile_id: userId,
        permission_id: entitlementId,
        active: true, // Still active until expiration
        expires_at: expirationString,
        product_id: existingPermission?.product_id,
        platform: existingPermission?.platform,
        revenuecat_user_id: userId,
        metadata: updatedMetadata
      });
    
    if (error) {
      console.error("Error updating cancelled permission:", error);
      throw error;
    }
    
    console.log(`✓ Cancellation processed for user ${userId}`);
    
  } catch (error) {
    console.error("Error in handleSubscriptionCancellation:", error);
    throw error;
  }
}

/**
 * Handle subscription expiration events
 * 
 * Deactivates permission record to immediately revoke access to premium features.
 * 
 * @param supabase - Supabase client with admin permissions
 * @param userId - User's profile ID
 * @param entitlementId - Entitlement identifier
 */
async function handleSubscriptionExpiration(
  supabase: any,
  userId: string,
  entitlementId: string
) {
  try {
    console.log(`Processing expiration for user ${userId}`);
    
    // Get existing record to preserve metadata
    const { data: existingPermission, error: fetchError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('profile_id', userId)
      .eq('permission_id', entitlementId)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Error fetching existing permission:", fetchError);
      throw fetchError;
    }
    
    // Prepare updated metadata
    const existingMetadata = existingPermission?.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      status: 'expired',
      expired_at: new Date().toISOString(),
      source: 'revenuecat_webhook'
    };
    
    // Deactivate permission
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        profile_id: userId,
        permission_id: entitlementId,
        active: false, // No longer active
        expires_at: existingPermission?.expires_at,
        product_id: existingPermission?.product_id,
        platform: existingPermission?.platform,
        revenuecat_user_id: userId,
        metadata: updatedMetadata
      });
    
    if (error) {
      console.error("Error deactivating expired permission:", error);
      throw error;
    }
    
    console.log(`✓ Subscription expired for user ${userId}`);
    
  } catch (error) {
    console.error("Error in handleSubscriptionExpiration:", error);
    throw error;
  }
}

/**
 * Handle billing issue events
 * 
 * Flags permission record with billing issue status while maintaining
 * access during the grace period provided by the store.
 * 
 * @param supabase - Supabase client with admin permissions
 * @param userId - User's profile ID
 * @param entitlementId - Entitlement identifier
 */
async function handleBillingIssue(
  supabase: any,
  userId: string,
  entitlementId: string
) {
  try {
    console.log(`Processing billing issue for user ${userId}`);
    
    // Get existing record to preserve details
    const { data: existingPermission, error: fetchError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('profile_id', userId)
      .eq('permission_id', entitlementId)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Error fetching existing permission:", fetchError);
      throw fetchError;
    }
    
    if (!existingPermission) {
      console.log(`No existing permission found for user ${userId}`);
      return;
    }
    
    // Prepare updated metadata with billing issue flag
    const existingMetadata = existingPermission.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      billing_issue: true,
      billing_issue_detected_at: new Date().toISOString(),
      source: 'revenuecat_webhook'
    };
    
    // Update permission - maintain access during grace period
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        profile_id: userId,
        permission_id: entitlementId,
        active: true, // Still active during grace period
        expires_at: existingPermission.expires_at,
        product_id: existingPermission.product_id,
        platform: existingPermission.platform,
        revenuecat_user_id: userId,
        metadata: updatedMetadata
      });
    
    if (error) {
      console.error("Error updating permission with billing issue:", error);
      throw error;
    }
    
    console.log(`✓ Billing issue recorded for user ${userId}`);
    
  } catch (error) {
    console.error("Error in handleBillingIssue:", error);
    throw error;
  }
}

/**
 * Trigger automatic premium insights generation for new product_a subscribers
 * 
 * Calls the analyze-golf-performance edge function to generate insights immediately
 * after a user purchases premium access. Includes proper error handling to ensure
 * webhook processing doesn't fail if insights generation encounters issues.
 * 
 * @param userId - User's profile ID
 */
async function triggerPremiumInsightsGeneration(userId: string) {
  try {
    console.log(`🎯 Triggering automatic premium insights generation for user ${userId}`);
    
    // Get Supabase URL for edge function call
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!SUPABASE_URL) {
      throw new Error("SUPABASE_URL not configured");
    }
    
    // Call the analyze-golf-performance edge function
    const insightsResponse = await fetch(`${SUPABASE_URL}/functions/v1/analyze-golf-performance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        userId: userId,
        trigger: 'purchase_webhook' // Flag to indicate this was triggered by purchase
      })
    });
    
    if (!insightsResponse.ok) {
      const errorText = await insightsResponse.text();
      console.error(`Insights generation failed for user ${userId}:`, errorText);
      // Don't throw - we don't want webhook processing to fail
      return;
    }
    
    const insightsResult = await insightsResponse.json();
    console.log(`✅ Premium insights generated successfully for user ${userId}:`, insightsResult.insightsId);
    
  } catch (error) {
    // Log error but don't throw - webhook processing should continue
    console.error(`Error generating insights for user ${userId}:`, error);
    console.log('Webhook processing will continue despite insights generation failure');
  }
}