// src/screens/AccountLegalScreen.js
import React, { useState } from "react";
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Linking,
  Alert 
} from "react-native";
import { supabase } from "../services/supabase";
import Layout from "../ui/Layout";
import theme from "../ui/theme";
import Button from "../ui/components/Button";
import Typography from "../ui/components/Typography";
import Card from "../ui/components/Card";

/**
 * Legal Links Section
 * 
 * Provides functional links to Terms of Use and Privacy Policy.
 */
const LegalLinksSection = () => {
  const openTermsOfUse = () => {
    const url = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
    Linking.openURL(url).catch(err => {
      console.error("Failed to open Terms of Use:", err);
      Alert.alert("Error", "Unable to open Terms of Use. Please try again.");
    });
  };

  const openPrivacyPolicy = () => {
    const url = "http://www.getgolfimprove.com/privacy";
    Linking.openURL(url).catch(err => {
      console.error("Failed to open Privacy Policy:", err);
      Alert.alert("Error", "Unable to open Privacy Policy. Please try again.");
    });
  };

  return (
    <Card style={styles.legalCard}>
      <Typography variant="subtitle" style={styles.sectionTitle}>
        Legal Information
      </Typography>
      
      <View style={styles.linkContainer}>
        <Button
          variant="outline"
          onPress={openTermsOfUse}
          iconRight="open-outline"
          style={styles.legalButton}
        >
          Terms of Use (EULA)
        </Button>
        
        <Button
          variant="outline"
          onPress={openPrivacyPolicy}
          iconRight="open-outline"
          style={styles.legalButton}
        >
          Privacy Policy
        </Button>
      </View>
    </Card>
  );
};

/**
 * Account Deletion Section
 * 
 * Provides secure account deletion functionality with confirmation flow.
 * Moved from ProfileScreen for better organization.
 */
const AccountDeletionSection = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Handle account deletion with confirmation
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your golf rounds, insights, and account data will be permanently deleted.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: confirmDeleteAccount
        }
      ]
    );
  };
  
  // Execute account deletion
  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    
    try {
      // Call the Supabase deletion function
      const { data, error } = await supabase.rpc('delete_current_user');
      
      if (error) {
        console.error('Account deletion error:', error);
        Alert.alert(
          "Deletion Failed", 
          "Unable to delete your account. Please try again or contact support.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Check if the function returned an error
      if (data && !data.success) {
        console.error('Account deletion function error:', data);
        Alert.alert(
          "Deletion Failed", 
          "Unable to delete your account. Please try again or contact support.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Success - the user will be automatically signed out due to account deletion
      // The AuthContext will handle navigation to AuthScreen when user becomes null
      console.log('Account deleted successfully:', data);
      
    } catch (err) {
      console.error('Account deletion exception:', err);
      Alert.alert(
        "Deletion Failed", 
        "An unexpected error occurred. Please try again or contact support.",
        [{ text: "OK" }]
      );
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <Card style={styles.deletionCard}>
      <Typography variant="subtitle" style={styles.sectionTitle}>
        Delete Account
      </Typography>
      
      <Typography variant="body" style={styles.deletionWarning}>
        Permanently delete your account and all associated data. This action cannot be undone.
      </Typography>
      
      <Button
        variant="outline"
        onPress={handleDeleteAccount}
        loading={isDeleting}
        iconLeft="trash-outline"
        style={styles.deleteButton}
        textStyle={styles.deleteButtonText}
      >
        Delete Account
      </Button>
    </Card>
  );
};

/**
 * Account & Legal Screen Component
 * 
 * Consolidated screen for account management and legal information.
 * Includes Terms of Use, Privacy Policy, and account deletion functionality.
 */
export default function AccountLegalScreen({ navigation }) {
  return (
    <Layout>
      <ScrollView contentContainerStyle={styles.container}>
        <Typography variant="title" style={styles.screenTitle}>
          Account & Legal
        </Typography>
        
        {/* Legal Links Section */}
        <LegalLinksSection />
        
        {/* Account Deletion Section */}
        <AccountDeletionSection />
        
        <View style={styles.spacer} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.medium,
    alignItems: "center",
  },
  screenTitle: {
    marginBottom: theme.spacing.large,
    textAlign: "center",
  },
  
  // Legal Links Section
  legalCard: {
    width: "100%",
    marginBottom: theme.spacing.medium,
  },
  sectionTitle: {
    marginBottom: theme.spacing.medium,
  },
  linkContainer: {
    gap: theme.spacing.small,
  },
  legalButton: {
    marginBottom: theme.spacing.small,
  },
  
  // Account Deletion Section
  deletionCard: {
    width: "100%",
    borderColor: "#ffebee", // Light red border for visual distinction
    borderWidth: 1,
  },
  deletionWarning: {
    marginBottom: theme.spacing.medium,
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  deleteButton: {
    borderColor: theme.colors.error || '#D32F2F',
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    color: theme.colors.error || '#D32F2F',
  },
  
  spacer: {
    height: 32,
  },
});