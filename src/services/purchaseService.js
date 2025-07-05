// src/services/purchaseService.js
//
// Enhanced RevenueCat-based purchase service with comprehensive diagnostics
// Maintains existing functionality while adding strategic troubleshooting capabilities

import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';

// Error types for structured error handling (maintaining existing interface)
export const PURCHASE_ERROR_TYPES = {
  CONNECTION: 'connection_error',
  CANCELLED: 'user_cancelled',
  ALREADY_OWNED: 'already_owned',
  NOT_ALLOWED: 'not_allowed',
  UNKNOWN: 'unknown_error',
  SERVER: 'server_error',
  CONFIGURATION: 'configuration_error',
  PRODUCTS_NOT_FOUND: 'products_not_found'
};

// Product configuration aligned with your RevenueCat setup
const PRODUCT_IDS = {
  ios: 'product_a',
  android: 'product_a'
};

// Expected offering identifier from your RevenueCat configuration
const EXPECTED_OFFERING = '$rc_monthly';

// Internal state tracking
let isConfigured = false;
let currentUserId = null;
let lastDiagnosticResult = null;

/**
 * Enhanced RevenueCat initialization with diagnostic capabilities
 * 
 * @param {string} userId - User's profile_id from Supabase
 * @returns {Promise<boolean>} Success status with diagnostic insights
 */
export async function initializePurchases(userId) {
  try {
    console.log('=== RevenueCat Initialization Starting ===');
    console.log('Initializing for user:', userId);

    // Get API keys from configuration
    const apiKeys = Constants.expoConfig?.extra?.revenueCatApiKeys;
    if (!apiKeys) {
      throw new Error('RevenueCat API keys not found in configuration');
    }

    const apiKey = Platform.OS === 'ios' ? apiKeys.ios : apiKeys.android;
    if (!apiKey) {
      throw new Error(`RevenueCat API key not found for platform: ${Platform.OS}`);
    }

    console.log(`Configuring RevenueCat for ${Platform.OS} with API key: ${apiKey.substring(0, 10)}...`);

    // Configure with user's profile_id as app_user_id
    await Purchases.configure({
      apiKey: apiKey,
      appUserID: userId
    });

    // Enable debug logging in development
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      console.log('Debug logging enabled for RevenueCat');
    }

    isConfigured = true;
    currentUserId = userId;
    
    console.log('RevenueCat SDK configured successfully');

    // Run initial diagnostic to validate configuration
    try {
      const diagnostic = await runComprehensiveDiagnostic();
      lastDiagnosticResult = diagnostic;
      
      if (diagnostic.configurationIssues.length > 0) {
        console.warn('Configuration issues detected:', diagnostic.configurationIssues);
      }
      
      if (diagnostic.expectedProductsFound.length === 0) {
        console.warn('Expected products not found - this may indicate configuration issues');
      }

      console.log('=== RevenueCat Initialization Complete ===');
      return true;
      
    } catch (diagnosticError) {
      console.error('Diagnostic failed but SDK initialized:', diagnosticError);
      // Don't fail initialization for diagnostic errors
      return true;
    }
    
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    isConfigured = false;
    return false;
  }
}

/**
 * Comprehensive diagnostic suite for RevenueCat configuration validation
 * 
 * @returns {Promise<Object>} Detailed diagnostic report
 */
export async function runComprehensiveDiagnostic() {
  try {
    console.log('=== Starting Comprehensive RevenueCat Diagnostic ===');
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      sdkReady: isConfigured,
      userId: currentUserId,
      offerings: null,
      products: [],
      expectedProductsFound: [],
      configurationIssues: [],
      recommendations: []
    };

    // Phase 1: SDK State Validation
    if (!isConfigured) {
      diagnostic.configurationIssues.push('RevenueCat SDK not properly initialized');
      diagnostic.recommendations.push('Call initializePurchases() before attempting purchases');
      return diagnostic;
    }

    console.log('✓ SDK initialization status: Ready');

    // Phase 2: Offerings Analysis
    try {
      const offerings = await Purchases.getOfferings();
      diagnostic.offerings = {
        total: Object.keys(offerings.all).length,
        current: offerings.current?.identifier || null,
        available: Object.keys(offerings.all)
      };

      console.log(`✓ Retrieved ${diagnostic.offerings.total} offerings`);
      console.log(`✓ Current offering: ${diagnostic.offerings.current || 'None set'}`);

      // Phase 3: Product Analysis
      const productAnalysis = [];
      Object.values(offerings.all).forEach(offering => {
        console.log(`\n--- Analyzing Offering: ${offering.identifier} ---`);
        
        offering.availablePackages.forEach(pkg => {
          const productInfo = {
            offeringId: offering.identifier,
            packageId: pkg.identifier,
            productId: pkg.product.identifier,
            productTitle: pkg.product.title || 'No title',
            productDescription: pkg.product.description || 'No description',
            price: pkg.product.priceString || 'Price unavailable',
            currencyCode: pkg.product.currencyCode || 'Currency unknown'
          };
          
          productAnalysis.push(productInfo);
          
          console.log(`  📦 Package: ${pkg.identifier}`);
          console.log(`  🏷️  Product ID: ${pkg.product.identifier}`);
          console.log(`  💰 Price: ${pkg.product.priceString || 'N/A'}`);
          console.log(`  📝 Title: ${pkg.product.title || 'N/A'}`);
        });
      });

      diagnostic.products = productAnalysis;

      // Phase 4: Expected Product Validation
      const expectedProductId = PRODUCT_IDS[Platform.OS];
      const foundProducts = productAnalysis.filter(p => p.productId === expectedProductId);
      diagnostic.expectedProductsFound = foundProducts;

      console.log(`\n=== Product Validation Results ===`);
      console.log(`Expected product ID: ${expectedProductId}`);
      console.log(`Found matching products: ${foundProducts.length}`);
      
      if (foundProducts.length === 0) {
        diagnostic.configurationIssues.push(`Expected product '${expectedProductId}' not found in any offering`);
        diagnostic.recommendations.push('Verify product is properly configured in RevenueCat dashboard');
        diagnostic.recommendations.push('Check if product is attached to the correct offering');
        diagnostic.recommendations.push('Confirm product status in App Store Connect');
      } else {
        foundProducts.forEach(p => {
          console.log(`✓ Found in offering: ${p.offeringId}, package: ${p.packageId}`);
        });
      }

      // Phase 5: Offering Architecture Validation
      if (diagnostic.offerings.current !== EXPECTED_OFFERING) {
        diagnostic.configurationIssues.push(`Current offering is '${diagnostic.offerings.current}', expected '${EXPECTED_OFFERING}'`);
        diagnostic.recommendations.push(`Set '${EXPECTED_OFFERING}' as default offering in RevenueCat dashboard`);
      }

      if (diagnostic.offerings.total === 0) {
        diagnostic.configurationIssues.push('No offerings configured');
        diagnostic.recommendations.push('Configure offerings in RevenueCat dashboard');
        diagnostic.recommendations.push('Ensure products are properly attached to offerings');
      }

      // Phase 6: Configuration Health Assessment
      if (productAnalysis.length === 0) {
        diagnostic.configurationIssues.push('No products found in any offering');
        diagnostic.recommendations.push('Import products from App Store Connect or add manually');
        diagnostic.recommendations.push('Verify App Store Connect API credentials in RevenueCat');
      }

    } catch (offeringsError) {
      console.error('Failed to retrieve offerings:', offeringsError);
      diagnostic.configurationIssues.push(`Offerings fetch failed: ${offeringsError.message}`);
      diagnostic.recommendations.push('Check RevenueCat dashboard configuration');
      diagnostic.recommendations.push('Verify App Store Connect integration');
    }

    // Phase 7: Platform-Specific Recommendations
    if (Platform.OS === 'ios' && diagnostic.configurationIssues.length > 0) {
      diagnostic.recommendations.push('For simulator testing, consider using StoreKit Configuration files');
      diagnostic.recommendations.push('Verify Paid Applications Agreement is signed in App Store Connect');
      diagnostic.recommendations.push('Check In-App Purchase capability is enabled in Xcode project');
    }

    console.log(`\n=== Diagnostic Summary ===`);
    console.log(`Configuration Issues: ${diagnostic.configurationIssues.length}`);
    console.log(`Recommendations: ${diagnostic.recommendations.length}`);
    console.log(`Products Found: ${diagnostic.products.length}`);
    console.log(`Expected Products Found: ${diagnostic.expectedProductsFound.length}`);

    return diagnostic;
    
  } catch (error) {
    console.error('Comprehensive diagnostic failed:', error);
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      sdkReady: isConfigured,
      configurationIssues: ['Diagnostic execution failed'],
      recommendations: ['Contact support with error details']
    };
  }
}

/**
 * Validate specific offering configuration
 * 
 * @param {string} offeringId - Offering identifier to validate
 * @returns {Promise<Object>} Offering validation result
 */
export async function validateOfferingConfiguration(offeringId = EXPECTED_OFFERING) {
  try {
    console.log(`=== Validating Offering: ${offeringId} ===`);
    
    if (!isConfigured) {
      throw new Error('RevenueCat not initialized');
    }

    const offerings = await Purchases.getOfferings();
    const targetOffering = offerings.all[offeringId];
    
    if (!targetOffering) {
      console.error(`Offering '${offeringId}' not found`);
      console.log('Available offerings:', Object.keys(offerings.all));
      return {
        found: false,
        offeringId,
        availableOfferings: Object.keys(offerings.all),
        error: `Offering '${offeringId}' not configured`
      };
    }

    const packages = targetOffering.availablePackages;
    const expectedProductId = PRODUCT_IDS[Platform.OS];
    const hasExpectedProduct = packages.some(pkg => pkg.product.identifier === expectedProductId);

    console.log(`✓ Offering found with ${packages.length} packages`);
    console.log(`✓ Contains expected product '${expectedProductId}': ${hasExpectedProduct}`);

    return {
      found: true,
      offeringId,
      packageCount: packages.length,
      hasExpectedProduct,
      packages: packages.map(pkg => ({
        id: pkg.identifier,
        productId: pkg.product.identifier,
        price: pkg.product.priceString
      }))
    };
    
  } catch (error) {
    console.error('Offering validation failed:', error);
    return {
      found: false,
      offeringId,
      error: error.message
    };
  }
}

/**
 * Get available offerings and packages from RevenueCat
 * Enhanced with diagnostic information
 * 
 * @returns {Promise<Object>} Available offerings with diagnostic metadata
 */
export async function getOfferings() {
  try {
    if (!isConfigured) {
      throw new Error('RevenueCat not configured. Call initializePurchases first.');
    }

    console.log('Fetching offerings...');
    const offerings = await Purchases.getOfferings();
    
    // Add diagnostic metadata
    const enhancedOfferings = {
      ...offerings,
      _diagnostic: {
        totalOfferings: Object.keys(offerings.all).length,
        currentOffering: offerings.current?.identifier,
        timestamp: new Date().toISOString(),
        expectedProductFound: false
      }
    };

    // Check for expected product
    const expectedProductId = PRODUCT_IDS[Platform.OS];
    Object.values(offerings.all).forEach(offering => {
      offering.availablePackages.forEach(pkg => {
        if (pkg.product.identifier === expectedProductId) {
          enhancedOfferings._diagnostic.expectedProductFound = true;
        }
      });
    });

    console.log('Offerings retrieved successfully:', enhancedOfferings._diagnostic);
    return enhancedOfferings;
    
  } catch (error) {
    console.error('Failed to get offerings:', error);
    throw mapToPublicError(error);
  }
}

/**
 * Enhanced purchase method with comprehensive error handling and diagnostics
 * 
 * @returns {Promise<Object>} Purchase result with diagnostic information
 */
export async function purchasePremiumInsights() {
  try {
    if (!isConfigured) {
      throw new Error('RevenueCat not configured. Call initializePurchases first.');
    }

    console.log('=== Starting Purchase Flow ===');
    console.log(`Platform: ${Platform.OS}`);
    console.log(`Expected product: ${PRODUCT_IDS[Platform.OS]}`);
    console.log(`Target offering: ${EXPECTED_OFFERING}`);

    // Pre-flight diagnostic check
    const diagnostic = await runComprehensiveDiagnostic();
    if (diagnostic.expectedProductsFound.length === 0) {
      throw new Error('Expected product not available for purchase. Check configuration.');
    }

    // Get offerings with retry logic
    let offerings;
    try {
      offerings = await Purchases.getOfferings();
    } catch (offeringsError) {
      console.error('Failed to fetch offerings:', offeringsError);
      throw new Error(`Unable to load purchase options: ${offeringsError.message}`);
    }

    // Find the target offering and package
    let packageToPurchase = null;
    const expectedProductId = PRODUCT_IDS[Platform.OS];
    
    // Strategy 1: Look in current/default offering first
    if (offerings.current) {
      packageToPurchase = offerings.current.availablePackages.find(
        pkg => pkg.product.identifier === expectedProductId
      );
      if (packageToPurchase) {
        console.log(`✓ Found product in current offering: ${offerings.current.identifier}`);
      }
    }

    // Strategy 2: Search all offerings if not found in current
    if (!packageToPurchase) {
      console.log('Product not found in current offering, searching all offerings...');
      
      Object.values(offerings.all).forEach(offering => {
        if (!packageToPurchase) {
          const foundPackage = offering.availablePackages.find(
            pkg => pkg.product.identifier === expectedProductId
          );
          if (foundPackage) {
            packageToPurchase = foundPackage;
            console.log(`✓ Found product in offering: ${offering.identifier}`);
          }
        }
      });
    }

    if (!packageToPurchase) {
      const availableProducts = [];
      Object.values(offerings.all).forEach(offering => {
        offering.availablePackages.forEach(pkg => {
          availableProducts.push(pkg.product.identifier);
        });
      });
      
      throw new Error(
        `Product '${expectedProductId}' not found. Available products: ${availableProducts.join(', ')}`
      );
    }

    console.log(`✓ Purchasing package: ${packageToPurchase.identifier}`);
    console.log(`✓ Product ID: ${packageToPurchase.product.identifier}`);
    console.log(`✓ Price: ${packageToPurchase.product.priceString}`);

    // Execute purchase through RevenueCat
    const purchaseResult = await Purchases.purchasePackage(packageToPurchase);
    
    console.log('✓ Purchase completed successfully');

    // Extract and validate result
    const customerInfo = purchaseResult.customerInfo;
    const activeEntitlements = customerInfo.entitlements.active;
    const hasProductA = 'product_a' in activeEntitlements;
    
    if (!hasProductA) {
      console.warn('Purchase completed but entitlement not immediately active');
    }

    // Return success with enhanced metadata
    return {
      success: true,
      productId: packageToPurchase.product.identifier,
      packageId: packageToPurchase.identifier,
      transactionId: purchaseResult.transaction?.transactionIdentifier,
      customerInfo: customerInfo,
      entitlementActive: hasProductA,
      _diagnostic: {
        offeringUsed: packageToPurchase.product.identifier,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Purchase error:', error);
    
    // Enhanced error analysis
    const publicError = mapToPublicError(error);
    
    // Add diagnostic context to error
    if (lastDiagnosticResult) {
      publicError._diagnostic = {
        lastConfigurationCheck: lastDiagnosticResult.timestamp,
        configurationIssues: lastDiagnosticResult.configurationIssues
      };
    }
    
    // Handle user cancellation
    if (publicError.code === PURCHASE_ERROR_TYPES.CANCELLED) {
      return { cancelled: true };
    }
    
    return { error: publicError };
  }
}

/**
 * Enhanced restore purchases with diagnostic capabilities
 * 
 * @returns {Promise<Object>} Restoration result with diagnostic information
 */
export async function restorePurchases() {
  try {
    if (!isConfigured) {
      throw new Error('RevenueCat not configured. Call initializePurchases first.');
    }

    console.log('=== Restoring Purchases ===');
    
    const customerInfo = await Purchases.restorePurchases();
    const activeEntitlements = customerInfo.entitlements.active;
    const hasProductA = 'product_a' in activeEntitlements;
    
    console.log(`Restoration completed. Active entitlements: ${Object.keys(activeEntitlements).length}`);
    
    if (hasProductA) {
      const entitlement = activeEntitlements.product_a;
      return {
        restored: true,
        expires_at: entitlement.expirationDate,
        _diagnostic: {
          entitlementsCount: Object.keys(activeEntitlements).length,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        restored: false,
        message: 'No active subscriptions found',
        _diagnostic: {
          entitlementsCount: Object.keys(activeEntitlements).length,
          timestamp: new Date().toISOString()
        }
      };
    }
    
  } catch (error) {
    console.error('Restore error:', error);
    const publicError = mapToPublicError(error);
    return {
      restored: false,
      error: publicError
    };
  }
}

/**
 * Get current customer info and entitlements
 * 
 * @returns {Promise<Object>} Customer information with diagnostic metadata
 */
export async function getCustomerInfo() {
  try {
    if (!isConfigured) {
      throw new Error('RevenueCat not configured. Call initializePurchases first.');
    }

    const customerInfo = await Purchases.getCustomerInfo();
    
    // Add diagnostic metadata
    const enhancedCustomerInfo = {
      ...customerInfo,
      _diagnostic: {
        activeEntitlementsCount: Object.keys(customerInfo.entitlements.active).length,
        hasProductA: 'product_a' in customerInfo.entitlements.active,
        timestamp: new Date().toISOString()
      }
    };
    
    return enhancedCustomerInfo;
    
  } catch (error) {
    console.error('Error getting customer info:', error);
    throw mapToPublicError(error);
  }
}

/**
 * Check if purchases are properly initialized
 * 
 * @returns {boolean} Initialization status
 */
export function isPurchasesReady() {
  return isConfigured;
}

/**
 * Get last diagnostic result for troubleshooting
 * 
 * @returns {Object|null} Last diagnostic result
 */
export function getLastDiagnostic() {
  return lastDiagnosticResult;
}

/**
 * Clean up RevenueCat listeners and reset state
 */
export function cleanupPurchases() {
  console.log('Cleaning up RevenueCat purchases');
  isConfigured = false;
  currentUserId = null;
  lastDiagnosticResult = null;
}

/**
 * Map RevenueCat errors to public error structure with enhanced context
 * 
 * @param {Error} error - RevenueCat error object
 * @returns {Object} Public-facing error structure
 */
function mapToPublicError(error) {
  const publicError = {
    code: PURCHASE_ERROR_TYPES.UNKNOWN,
    message: 'An unknown error occurred',
    timestamp: new Date().toISOString()
  };

  // Map RevenueCat error codes
  if (error.code) {
    switch (error.code) {
      case 'USER_CANCELLED':
        publicError.code = PURCHASE_ERROR_TYPES.CANCELLED;
        publicError.message = 'Purchase was cancelled';
        break;
        
      case 'ITEM_ALREADY_OWNED':
        publicError.code = PURCHASE_ERROR_TYPES.ALREADY_OWNED;
        publicError.message = 'You already own this item';
        break;
        
      case 'STORE_PROBLEM':
        publicError.code = PURCHASE_ERROR_TYPES.CONNECTION;
        publicError.message = 'Store connection failed';
        break;
        
      case 'INVALID_PURCHASE':
        publicError.code = PURCHASE_ERROR_TYPES.SERVER;
        publicError.message = 'Purchase validation failed';
        break;
        
      default:
        publicError.message = error.message || 'Purchase failed';
    }
  } else if (error.message) {
    // Enhanced error message analysis
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection')) {
      publicError.code = PURCHASE_ERROR_TYPES.CONNECTION;
      publicError.message = 'Network connection failed';
    } else if (message.includes('configuration') || message.includes('not found')) {
      publicError.code = PURCHASE_ERROR_TYPES.CONFIGURATION;
      publicError.message = error.message;
    } else if (message.includes('products') && message.includes('empty')) {
      publicError.code = PURCHASE_ERROR_TYPES.PRODUCTS_NOT_FOUND;
      publicError.message = 'Products not available. Check configuration.';
    } else {
      publicError.message = error.message;
    }
  }

  return publicError;
}

// Export the same interface with enhanced capabilities
export default {
  initializePurchases,
  cleanupPurchases,
  getOfferings,
  purchasePremiumInsights,
  restorePurchases,
  getCustomerInfo,
  isPurchasesReady,
  // Enhanced diagnostic capabilities
  runComprehensiveDiagnostic,
  validateOfferingConfiguration,
  getLastDiagnostic,
  // Error types
  PURCHASE_ERROR_TYPES
};