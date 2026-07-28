import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, Switch, Image, Platform } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { 
  Settings as SettingsIcon, 
  User, 
  Activity, 
  Heart, 
  Shield, 
  LogOut,
  ChevronRight,
  HelpCircle,
  Smartphone,
  Eye,
  ShieldAlert
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import useColorScheme from "@/hooks/useColorScheme";
import { useColorScheme as useColorSchemeNative } from "nativewind";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertDialog, 
  AlertDialogBackdrop, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogFooter, 
  AlertDialogBody 
} from "@/components/ui/alert-dialog";
import { Button, ButtonText } from "@/components/ui/button";
import { flattenStyle } from "@/utils/flatten-style";

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { toggleColorScheme } = useColorSchemeNative();
  const { user, profile, refreshProfile } = useAuth();

  // Integration states
  const [stravaEnabled, setStravaEnabled] = useState(false);
  const [healthEnabled, setHealthEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  React.useEffect(() => {
    if (user) {
      // Check if user is admin
      supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
        .then(({ data }) => {
          setIsAdmin(!!data);
        });
    }
  }, [user]);

  React.useEffect(() => {
    if (profile) {
      setAdminMode(!!profile.adminMode);
    }
  }, [profile]);

  const handleAdminModeToggle = async (val: boolean) => {
    if (!user) return;
    setAdminMode(val);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_mode: val })
        .eq('id', user.id);
      
      if (error) throw error;
      if (refreshProfile) refreshProfile();
    } catch (err) {
      console.warn("Error updating admin mode:", err);
      setAdminMode(!val); // revert on error
    }
  };
  const [showLogoutAlertDialog, setShowLogoutAlertDialog] = useState(false);

  const themeClasses = {
    bg: isDark ? "bg-background-950" : "bg-background-0",
    text: isDark ? "text-typography-50" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    cardBg: isDark ? "bg-background-900 border-outline-800" : "bg-background-50 border-outline-100",
  };

  const handleLogout = async () => {
    try {
      setShowLogoutAlertDialog(false);
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Error signing out:", err);
    }
  };

  return (
    <>
      <ScrollView style={flattenStyle([styles.container, isDark ? styles.bgDark : styles.bgLight])} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <HStack style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <SettingsIcon size={20} color="#10B981" />
          </View>
          <VStack>
            <Heading className={`text-xl font-extrabold ${themeClasses.text}`}>Innstillinger</Heading>
            <Text className={`text-xs ${themeClasses.textMuted}`}>Administrer din profil og integrasjoner</Text>
          </VStack>
        </HStack>
      </View>

      {/* User Profile Card */}
      <Card className={`p-4 mb-6 ${themeClasses.cardBg}`} style={styles.profileCard}>
        <HStack style={{ alignItems: "center" }}>
          <View style={flattenStyle([styles.avatarPlaceholder, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <User size={24} color="#10B981" />
            )}
          </View>
          <VStack style={{ flex: 1, marginLeft: 16 }}>
            <Heading className={`text-lg font-bold ${themeClasses.text}`}>
              {profile?.username || "Spreking"}
            </Heading>
            <Text className={`text-xs ${themeClasses.textMuted}`}>
              Din profil er {profile?.privacyWorkouts === 'public' ? 'offentlig' : 'privat'}
            </Text>
          </VStack>
        </HStack>
      </Card>

      {/* Integrations Section */}
      <View style={styles.section}>
        <Heading className={`text-sm font-bold uppercase tracking-wider mb-3 ${themeClasses.textMuted}`}>
          Integrasjoner
        </Heading>
        
        <Card className={`p-4 ${themeClasses.cardBg}`} style={styles.menuCard}>
          <VStack style={{ gap: 16 }}>
            {/* Strava */}
            <HStack style={styles.menuItem}>
              <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#FC642D15" }])}>
                <Activity size={18} color="#FC642D" />
              </View>
              <VStack style={{ flex: 1, marginLeft: 12 }}>
                <Text className={`font-bold text-sm ${themeClasses.text}`}>Koble til Strava</Text>
                <Text className={`text-xs ${themeClasses.textMuted}`}>Synkroniser dine løpe- og sykkelturer automatisk</Text>
              </VStack>
              <Switch 
                value={stravaEnabled} 
                onValueChange={setStravaEnabled}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </HStack>

            <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />

            {/* Apple Health / Google Fit */}
            <HStack style={styles.menuItem}>
              <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#E11D4815" }])}>
                <Heart size={18} color="#E11D48" />
              </View>
              <VStack style={{ flex: 1, marginLeft: 12 }}>
                <Text className={`font-bold text-sm ${themeClasses.text}`}>
                  {Platform.OS === "ios" ? "Apple Health" : "Google Fit"}
                </Text>
                <Text className={`text-xs ${themeClasses.textMuted}`}>Synkroniser skritt og helsedata automatisk</Text>
              </VStack>
              <Switch 
                value={healthEnabled} 
                onValueChange={setHealthEnabled}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </HStack>
          </VStack>
        </Card>
      </View>

      {/* App settings Section */}
      <View style={styles.section}>
        <Heading className={`text-sm font-bold uppercase tracking-wider mb-3 ${themeClasses.textMuted}`}>
          App-innstillinger
        </Heading>
        
        <Card className={`p-4 ${themeClasses.cardBg}`} style={styles.menuCard}>
          <VStack style={{ gap: 16 }}>
            {/* Notifications */}
            <HStack style={styles.menuItem}>
              <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#10B98115" }])}>
                <Smartphone size={18} color="#10B981" />
              </View>
              <VStack style={{ flex: 1, marginLeft: 12 }}>
                <Text className={`font-bold text-sm ${themeClasses.text}`}>Varslinger</Text>
                <Text className={`text-xs ${themeClasses.textMuted}`}>Motta påminnelser og ukentlige oppdateringer</Text>
              </VStack>
              <Switch 
                value={notificationsEnabled} 
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </HStack>

            <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />

            {/* Dark Mode Theme indicator */}
            <HStack style={styles.menuItem}>
              <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: isDark ? "#10B98115" : "#6B728015" }])}>
                <Eye size={18} color={isDark ? "#10B981" : "#6B7280"} />
              </View>
              <VStack style={{ flex: 1, marginLeft: 12 }}>
                <Text className={`font-bold text-sm ${themeClasses.text}`}>Mørkt tema</Text>
                <Text className={`text-xs ${themeClasses.textMuted}`}>Aktiver eller deaktiver mørkt utseende</Text>
              </VStack>
              <Switch 
                value={isDark} 
                onValueChange={() => {
                  toggleColorScheme();
                }}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </HStack>
          </VStack>
        </Card>
      </View>

      {/* Admin Section (Only visible if isAdmin) */}
      {isAdmin && (
        <View style={styles.section}>
          <Heading className={`text-sm font-bold uppercase tracking-wider mb-3 ${themeClasses.textMuted}`}>
            Administrator
          </Heading>
          
          <Card className={`p-4 ${themeClasses.cardBg}`} style={styles.menuCard}>
            <VStack style={{ gap: 16 }}>
              <HStack style={styles.menuItem}>
                <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#6366f115" }])}>
                  <ShieldAlert size={18} color="#6366f1" />
                </View>
                <VStack style={{ flex: 1, marginLeft: 12 }}>
                  <Text className={`font-bold text-sm ${themeClasses.text}`}>Admin modus</Text>
                  <Text className={`text-xs ${themeClasses.textMuted}`}>Vis administrative verktøy og rapporter</Text>
                </VStack>
                <Switch 
                  value={adminMode} 
                  onValueChange={handleAdminModeToggle}
                  trackColor={{ false: "#D1D5DB", true: "#6366f1" }}
                  thumbColor="#FFFFFF"
                />
              </HStack>
            </VStack>
          </Card>
        </View>
      )}

      {/* Support & Logout Section */}
      <View style={styles.section}>
        <Card className={`p-4 ${themeClasses.cardBg}`} style={styles.menuCard}>
          <VStack style={{ gap: 16 }}>
            {/* Support */}
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <HStack style={{ alignItems: "center", flex: 1 }}>
                <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#3B82F615" }])}>
                  <HelpCircle size={18} color="#3B82F6" />
                </View>
                <VStack style={{ flex: 1, marginLeft: 12 }}>
                  <Text className={`font-bold text-sm ${themeClasses.text}`}>Hjelp & Support</Text>
                  <Text className={`text-xs ${themeClasses.textMuted}`}>Kontakt oss og les ofte stilte spørsmål</Text>
                </VStack>
              </HStack>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />

            {/* Logout */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => setShowLogoutAlertDialog(true)} 
              activeOpacity={0.7}
            >
              <HStack style={{ alignItems: "center", flex: 1 }}>
                <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#EF444415" }])}>
                  <LogOut size={18} color="#EF4444" />
                </View>
                <VStack style={{ flex: 1, marginLeft: 12 }}>
                  <Text className="font-bold text-sm text-red-500">Logg ut</Text>
                  <Text className={`text-xs ${themeClasses.textMuted}`}>Avslutt din nåværende økt</Text>
                </VStack>
              </HStack>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </VStack>
        </Card>
      </View>
    </ScrollView>

    <AlertDialog
      isOpen={showLogoutAlertDialog}
      onClose={() => setShowLogoutAlertDialog(false)}
      useRNModal={Platform.OS !== "web"}
    >
      <AlertDialogBackdrop />
      <AlertDialogContent className={isDark ? "bg-background-900" : "bg-background-0"}>
        <AlertDialogHeader>
          <Heading size="md" className={themeClasses.text}>Logg ut</Heading>
        </AlertDialogHeader>
        <AlertDialogBody>
          <Text className={themeClasses.textMuted}>
            Er du sikker på at du vil logge ut? Du må logge inn på nytt for å se dine data.
          </Text>
        </AlertDialogBody>
        <AlertDialogFooter className="mt-4">
          <Button
            variant="outline"
            action="secondary"
            onPress={() => setShowLogoutAlertDialog(false)}
            className="mr-2"
          >
            <ButtonText>Avbryt</ButtonText>
          </Button>
          <Button action="negative" onPress={handleLogout}>
            <ButtonText>Logg ut</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: "#F9FAFB",
  },
  bgDark: {
    backgroundColor: "#030712",
  },
  contentContainer: {
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 30,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    alignItems: "center",
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#10B98115",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  section: {
    marginBottom: 24,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
  },
});
