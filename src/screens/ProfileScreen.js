// src/screens/ProfileScreen.js
import React, { useContext, useState, useEffect, useCallback } from "react";
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
  Linking,
  RefreshControl
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import Layout from "../ui/Layout";
import theme from "../ui/theme";
import Button from "../ui/components/Button";
import Typography from "../ui/components/Typography";
import PremiumButton from "../components/PremiumButton";
import Card from "../ui/components/Card";
import debounce from 'lodash/debounce';

/**
 * Subscription Management Component
 * 
 * Displays subscription status and management options.
 * Provides IAP flow for non-premium users.
 */
const SubscriptionManagementSection = () => {
  const { user, hasPermission } = useContext(AuthContext);
  const isPremium = hasPermission("product_a");
  const [pricingInfo, setPricingInfo] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  
  // Load pricing information from RevenueCat
  useEffect(() => {
    const loadPricingInfo = async () => {
      if (isPremium) return; // Don't load pricing for premium users
      
      try {
        setLoadingPricing(true);
        const { default: purchaseService } = await import('../services/purchaseService');
        
        if (!purchaseService.isPurchasesReady()) return;
        
        const offerings = await purchaseService.getOfferings();
        
        // Find the product in offerings
        const expectedProductId = Platform.OS === 'ios' ? 'product_a' : 'product_a';
        let productPrice = null;
        
        Object.values(offerings.all).forEach(offering => {
          offering.availablePackages.forEach(pkg => {
            if (pkg.product.identifier === expectedProductId) {
              // Format price to clearly show it's a monthly subscription
              const basePrice = pkg.product.priceString;
              productPrice = basePrice ? `${basePrice}/month` : null;
            }
          });
        });
        
        setPricingInfo(productPrice);
      } catch (error) {
        console.error('Error loading pricing:', error);
      } finally {
        setLoadingPricing(false);
      }
    };
    
    loadPricingInfo();
  }, [isPremium]);
  
  // Handle successful purchase completion
  const handlePurchaseComplete = (result) => {
    console.log("Purchase completed successfully:", result);
  };
  
  // Handle failed purchase
  const handlePurchaseFailed = (error) => {
    console.error("Purchase failed:", error);
  };
  
  // Open platform-specific subscription management
  const openSubscriptionSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Deep link to the App Store subscriptions page
        await Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
      } else if (Platform.OS === 'android') {
        // Deep link to Google Play subscriptions
        const packageName = "com.tmworl.golfimprove"; // From your app.json
        await Linking.openURL(`https://play.google.com/store/account/subscriptions?package=${packageName}`);
      }
    } catch (error) {
      console.error("Error opening subscription settings:", error);
      Alert.alert(
        "Couldn't Open Settings",
        "Please manage your subscription through your device's app store settings."
      );
    }
  };

  return (
    <Card style={styles.subscriptionCard}>
      <Typography variant="subtitle" style={styles.sectionTitle}>
        Premium Features
      </Typography>
      
      {isPremium ? (
        // Active subscription view
        <View>
          <View style={styles.statusContainer}>
            <View style={styles.premiumBadge}>
              <Typography variant="caption" weight="semibold" color="#FFF">
                PREMIUM
              </Typography>
            </View>
            <Typography variant="body" style={styles.statusText}>
              Your premium features are active
            </Typography>
          </View>
          
          <Typography variant="body" style={styles.benefitText}>
            You have access to advanced insights, detailed analytics, and personalized recommendations to improve your game.
          </Typography>
          
          <Button
            variant="outline"
            onPress={openSubscriptionSettings}
            iconRight="open-outline"
            style={styles.manageButton}
          >
            Manage Subscription
          </Button>
        </View>
      ) : (
        // Non-subscriber view with purchase option
        <View>
          <Typography variant="body" style={styles.upgradeDescription}>
            Upgrade to unlock premium features:
          </Typography>
          
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Typography variant="body" style={styles.benefitText}>
                • Personalized shot analysis and recommendations
              </Typography>
            </View>
            
            <View style={styles.benefitItem}>
              <Typography variant="body" style={styles.benefitText}>
                • Detailed insights into your game patterns
              </Typography>
            </View>
            
            <View style={styles.benefitItem}>
              <Typography variant="body" style={styles.benefitText}>
                • Advanced stats across multiple rounds
              </Typography>
            </View>
            
            <View style={styles.benefitItem}>
              <Typography variant="body" style={styles.benefitText}>
                • Training plan to get you to your target handicap
              </Typography>
            </View>
          </View>
          
          {/* Price Display - Right before purchase button */}
          <View style={styles.priceHeader}>
            {pricingInfo && (
              <Typography variant="title" weight="bold" style={styles.priceText}>
                {pricingInfo}
              </Typography>
            )}
            {loadingPricing && (
              <Typography variant="body" style={styles.priceLoadingText}>
                Loading price...
              </Typography>
            )}
          </View>
          
          <PremiumButton
            label="Upgrade to Premium"
            onPurchaseComplete={handlePurchaseComplete}
            onPurchaseFailed={handlePurchaseFailed}
            style={styles.upgradeButton}
          />
          
          {/* Apple Required Legal Text */}
          <View style={styles.legalTextContainer}>
            <Typography variant="caption" style={styles.legalText}>
              Payment will be charged to your Apple ID account at the confirmation of purchase. Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. Subscriptions may be managed by the user and auto-renewal may be turned off by going to the user's Account Settings after purchase.
            </Typography>
          </View>
        </View>
      )}
    </Card>
  );
};

/**
 * Account & Legal Navigation Component
 * 
 * Provides navigation to the Account & Legal screen where users can
 * access Terms of Use, Privacy Policy, and account deletion functionality.
 */
const AccountLegalNavigationSection = ({ navigation }) => {
  const handleNavigateToAccountLegal = () => {
    navigation.navigate('AccountLegal');
  };
  
  return (
    <Card style={styles.accountLegalCard}>
      <Typography variant="subtitle" style={styles.sectionTitle}>
        Account
      </Typography>
      
      <Typography variant="body" style={styles.accountLegalDescription}>
        Access legal information and account management options.
      </Typography>
      
      <Button
        variant="outline"
        onPress={handleNavigateToAccountLegal}
        iconRight="chevron-forward-outline"
        style={styles.accountLegalButton}
      >
        Account & Legal Information
      </Button>
    </Card>
  );
};

/**
 * ProfileScreen Component
 * 
 * Enhanced with target handicap functionality for personalized improvement tracking.
 * Features handicap tracking with real-time database synchronization and validation.
 * Includes navigation to Account & Legal screen for legal information and account management.
 */
export default function ProfileScreen({ navigation }) {
  // Access authentication context
  const { user, signOut } = useContext(AuthContext);
  
  // Local state for form inputs and processing
  const [handicap, setHandicap] = useState("");
  const [targetHandicap, setTargetHandicap] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
  const [validationErrors, setValidationErrors] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  
  // Load user profile data
  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('handicap, target_handicap')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      // Format handicaps properly for display
      if (data) {
        if (data.handicap !== null) {
          setHandicap(data.handicap.toString());
        }
        if (data.target_handicap !== null) {
          setTargetHandicap(data.target_handicap.toString());
        }
      }
    } catch (error) {
      console.error("Error loading profile data:", error.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Load user profile data on mount
  useEffect(() => {
    loadUserProfile();
  }, [user]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
  };
  
  // Validation function for target handicap
  const validateTargetHandicap = useCallback((current, target) => {
    const errors = {};
    
    if (current !== "" && target !== "") {
      const currentValue = parseFloat(current);
      const targetValue = parseFloat(target);
      
      if (!isNaN(currentValue) && !isNaN(targetValue)) {
        if (targetValue >= currentValue) {
          errors.targetHandicap = "Target handicap must be lower than current handicap";
        }
      }
    }
    
    return errors;
  }, []);
  
  // Create debounced save function to prevent excessive database writes
  const debouncedSaveProfile = useCallback(
    debounce(async (userId, newHandicap, newTargetHandicap) => {
      if (!userId) return;
      
      setIsSaving(true);
      setSaveStatus(null);
      setValidationErrors({});
      
      try {
        // Validate target handicap before saving
        const errors = validateTargetHandicap(newHandicap, newTargetHandicap);
        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(null), 3000);
          return;
        }
        
        // Convert empty strings to null for database consistency
        const handicapValue = newHandicap.trim() === "" 
          ? null 
          : parseFloat(newHandicap);
          
        const targetHandicapValue = newTargetHandicap.trim() === ""
          ? null
          : parseFloat(newTargetHandicap);
          
        // Execute database update with optimized query pattern
        const { error } = await supabase
          .from('profiles')
          .update({ 
            handicap: handicapValue,
            target_handicap: targetHandicapValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
          
        if (error) throw error;
        
        // Clear any previous validation errors
        setValidationErrors({});
        
        // Indicate success briefly
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (error) {
        console.error("Error updating profile:", error.message);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      } finally {
        setIsSaving(false);
      }
    }, 600),
    [validateTargetHandicap]
  );
  
  // Handle handicap input changes with validation
  const handleHandicapChange = (text) => {
    // Enforce numeric input pattern with period allowed
    if (text === "" || /^-?\d*\.?\d*$/.test(text)) {
      setHandicap(text);
      // Clear validation errors when handicap changes
      if (validationErrors.targetHandicap) {
        setValidationErrors({});
      }
    }
  };
  
  // Handle target handicap input changes with validation
  const handleTargetHandicapChange = (text) => {
    // Enforce numeric input pattern with period allowed
    if (text === "" || /^-?\d*\.?\d*$/.test(text)) {
      setTargetHandicap(text);
      // Clear validation errors when target changes
      if (validationErrors.targetHandicap) {
        setValidationErrors({});
      }
    }
  };
  
  // Handle blur event for any handicap field (when user finishes editing)
  const handleHandicapBlur = () => {
    if (user) {
      debouncedSaveProfile(user.id, handicap, targetHandicap);
    }
  };
  
  // Get status indicator styles and text
  const getStatusIndicator = () => {
    if (!saveStatus) return null;
    
    const isSuccess = saveStatus === 'success';
    
    return (
      <Typography 
        variant="caption" 
        style={[
          styles.statusText, 
          isSuccess ? styles.successText : styles.errorText
        ]}
      >
        {isSuccess ? "Profile saved" : "Error saving profile"}
      </Typography>
    );
  };

  return (
    <Layout>
      {/* Dismiss keyboard on container tap */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          {/* User Information Section */}
          <View style={styles.userInfoSection}>
            <Typography variant="subtitle" style={styles.sectionTitle}>
              Account Information
            </Typography>
            
            <View style={styles.infoItem}>
              <Typography variant="body" style={styles.infoLabel}>
                Email
              </Typography>
              <Typography variant="body" style={styles.infoValue}>
                {user?.email}
              </Typography>
            </View>
          </View>
          
          {/* Enhanced Golf Profile Section */}
          <View style={styles.handicapSection}>
            <Typography variant="subtitle" style={styles.sectionTitle}>
              Golf Profile
            </Typography>
            
            {/* Current Handicap */}
            <View style={styles.handicapContainer}>
              <Typography variant="body" style={styles.handicapLabel}>
                Current Handicap
              </Typography>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.handicapInput}
                  value={handicap}
                  onChangeText={handleHandicapChange}
                  onBlur={handleHandicapBlur}
                  placeholder="Enter handicap"
                  keyboardType="numeric"
                  returnKeyType="done"
                  maxLength={5} // Reasonable limit for handicap values
                />
              </View>
            </View>
            
            {/* Target Handicap */}
            <View style={styles.handicapContainer}>
              <Typography variant="body" style={styles.handicapLabel}>
                Target Handicap
              </Typography>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.handicapInput,
                    validationErrors.targetHandicap && styles.inputError
                  ]}
                  value={targetHandicap}
                  onChangeText={handleTargetHandicapChange}
                  onBlur={handleHandicapBlur}
                  placeholder="Goal handicap"
                  keyboardType="numeric"
                  returnKeyType="done"
                  maxLength={5}
                />
                
                {isSaving && (
                  <View style={styles.loadingIndicator} />
                )}
              </View>
            </View>
            
            {/* Status and Error Display */}
            <View style={styles.statusContainer}>
              {validationErrors.targetHandicap && (
                <Typography variant="caption" style={styles.errorText}>
                  {validationErrors.targetHandicap}
                </Typography>
              )}
              
              {getStatusIndicator()}
            </View>
            
            <Typography variant="caption" style={styles.helpText}>
              Set your target handicap to receive personalized improvement recommendations. Target must be lower than your current handicap.
            </Typography>
          </View>
          
          {/* Subscription Management Section */}
          <SubscriptionManagementSection />
          
          {/* Account & Legal Navigation Section */}
          <AccountLegalNavigationSection navigation={navigation} />
          
          <View style={styles.spacer} />
          
          {/* Sign Out Button */}
          <Button 
            variant="primary" 
            onPress={signOut}
            iconLeft="log-out-outline"
            style={styles.signOutButton}
          >
            Sign Out
          </Button>
        </ScrollView>
      </TouchableWithoutFeedback>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.medium,
    alignItems: "center",
  },
  userInfoSection: {
    width: "100%", 
    backgroundColor: "#fff",
    borderRadius: theme.layout.borderRadius.medium,
    padding: theme.spacing.medium,
    ...theme.elevation.low,
  },
  handicapSection: {
    width: "100%", 
    backgroundColor: "#fff",
    borderRadius: theme.layout.borderRadius.medium,
    padding: theme.spacing.medium,
    marginTop: theme.spacing.medium,
    ...theme.elevation.low,
  },
  sectionTitle: {
    marginBottom: theme.spacing.medium,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    color: theme.colors.secondary,
  },
  infoValue: {
    fontWeight: theme.typography.fontWeight.medium,
  },
  handicapContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  handicapLabel: {
    color: theme.colors.secondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  handicapInput: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: "right",
    minWidth: 60,
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  inputError: {
    borderBottomColor: theme.colors.error || '#D32F2F',
  },
  loadingIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
    opacity: 0.7,
  },
  statusContainer: {
    marginTop: theme.spacing.small,
    minHeight: 20, // Prevent layout shift
  },
  statusText: {
    marginLeft: 8,
  },
  successText: {
    color: theme.colors.success || '#4CAF50',
  },
  errorText: {
    color: theme.colors.error || '#D32F2F',
  },
  helpText: {
    marginTop: theme.spacing.small,
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  spacer: {
    height: 32,
  },
  signOutButton: {
    minWidth: 200,
  },
  
  // Subscription component styles
  subscriptionCard: {
    width: "100%", 
    marginTop: theme.spacing.medium,
  },
  premiumBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  standardText: {
    marginBottom: theme.spacing.medium,
    color: theme.colors.secondary,
  },
  pricingContainer: {
    marginBottom: theme.spacing.medium,
  },
  upgradeDescription: {
    marginBottom: theme.spacing.small,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  priceHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
  },
  pricingTitle: {
    marginBottom: theme.spacing.small,
  },
  priceText: {
    fontSize: 24,
    color: theme.colors.primary,
    marginBottom: theme.spacing.small,
  },
  priceLoadingText: {
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  benefitsContainer: {
    marginBottom: theme.spacing.medium,
  },
  benefitItem: {
    marginBottom: 4,
  },
  benefitText: {
    color: theme.colors.secondary,
  },
  legalTextContainer: {
    marginTop: theme.spacing.medium,
    padding: theme.spacing.small,
    backgroundColor: '#f8f9fa',
    borderRadius: theme.layout.borderRadius.small,
  },
  legalText: {
    color: theme.colors.secondary,
    lineHeight: 16,
    fontSize: 11,
  },
  manageButton: {
    marginTop: theme.spacing.medium,
  },
  upgradeButton: {
    marginTop: theme.spacing.small,
  },
  
  // Account & Legal Navigation styles
  accountLegalCard: {
    width: "100%", 
    marginTop: theme.spacing.medium,
  },
  accountLegalDescription: {
    marginBottom: theme.spacing.medium,
    color: theme.colors.secondary,
  },
  accountLegalButton: {
    marginTop: theme.spacing.small,
  },
});