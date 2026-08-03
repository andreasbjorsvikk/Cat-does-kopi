import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, Switch, Image, Platform } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { 
  User, 
  ChevronRight,
  Settings as SettingsIcon,
  Moon,
  Globe,
  Link2,
  Palette,
  Sliders,
  Shield,
  Activity,
  Bell,
  HelpCircle,
  LogOut,
  ShieldAlert
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import useColorScheme from "@/hooks/useColorScheme";
import { useColorScheme as useColorSchemeNative } from "nativewind";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
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
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
} from "@/components/ui/select";
import { ChevronDownIcon } from "@/components/ui/icon";

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { toggleColorScheme } = useColorSchemeNative();
  const { user, profile, refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [showLogoutAlertDialog, setShowLogoutAlertDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  React.useEffect(() => {
    if (user) {
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
      setAdminMode(!val);
    }
  };

  const handleLogout = async () => {
    try {
      setShowLogoutAlertDialog(false);
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (err) {
      console.warn("Error signing out:", err);
    }
  };

  const themeClasses = {
    bg: isDark ? "bg-background-950" : "bg-background-0",
    text: isDark ? "text-typography-50" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    cardBg: isDark ? "bg-background-900 border-outline-800" : "bg-background-50 border-outline-100",
    divider: isDark ? "bg-outline-800" : "bg-outline-100",
  };

  const MenuRow = ({ 
    icon: Icon, 
    label, 
    value, 
    onPress, 
    showChevron = true,
    iconColor = "#10B981",
    destructive = false
  }: { 
    icon: any, 
    label: string, 
    value?: string, 
    onPress?: () => void, 
    showChevron?: boolean,
    iconColor?: string,
    destructive?: boolean
  }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <HStack style={{ alignItems: "center", flex: 1 }}>
        <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: `${iconColor}15` }])}>
          <Icon size={18} color={iconColor} />
        </View>
        <VStack style={{ flex: 1, marginLeft: 12 }}>
          <Text className={`font-semibold text-sm ${destructive ? "text-red-500" : themeClasses.text}`}>
            {label}
          </Text>
        </VStack>
        {value && (
          <Text className={`text-xs mr-2 ${themeClasses.textMuted}`}>
            {value}
          </Text>
        )}
      </HStack>
      {showChevron && <ChevronRight size={16} color={isDark ? "#4B5563" : "#9CA3AF"} />}
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView 
        style={flattenStyle([styles.container, isDark ? styles.bgDark : styles.bgLight])} 
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Heading className={`text-2xl font-extrabold ${themeClasses.text}`}>{t("settings.title")}</Heading>
        </View>

        {/* Profile Section */}
        <Card className={`p-4 mb-6 ${themeClasses.cardBg}`} style={styles.card}>
          <HStack style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={flattenStyle([styles.avatarContainer, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <User size={30} color="#10B981" />
              )}
            </View>
            <VStack style={{ flex: 1, marginLeft: 16 }}>
              <Heading className={`text-xl font-bold ${themeClasses.text}`}>
                {profile?.username || "Spreking"}
              </Heading>
              <Text className={`text-sm ${themeClasses.textMuted}`}>
                {user?.email}
              </Text>
            </VStack>
          </HStack>
          
          <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />
          
          <MenuRow 
            icon={User} 
            label={t("profile.profileSettings")}
            onPress={() => router.push("/(tabs)/settings/profile")} 
          />
        </Card>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Heading className={`text-xs font-bold uppercase tracking-widest mb-3 ${themeClasses.textMuted}`}>
            {t("settings.title").toUpperCase()}
          </Heading>
          
          <Card className={`p-0 overflow-hidden ${themeClasses.cardBg}`} style={styles.card}>
            <View style={styles.menuItemPadding}>
              <HStack style={styles.menuItem}>
                <HStack style={{ alignItems: "center", flex: 1 }}>
                  <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#10B98115" }])}>
                    <Moon size={18} color="#10B981" />
                  </View>
                  <Text className={`font-semibold text-sm ml-3 ${themeClasses.text}`}>{t("settings.darkMode")}</Text>
                </HStack>
                <Switch 
                  value={isDark} 
                  onValueChange={toggleColorScheme}
                  trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              </HStack>

              <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />

              <HStack style={styles.menuItem}>
                <HStack style={{ alignItems: "center", flex: 1 }}>
                  <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#10B98115" }])}>
                    <Globe size={18} color="#10B981" />
                  </View>
                  <Text className={`font-semibold text-sm ml-3 ${themeClasses.text}`}>{t('settings.language')}</Text>
                </HStack>
                
                <Select selectedValue={language} onValueChange={(val) => setLanguage(val as any)}>
                  <SelectTrigger variant="outline" size="sm" style={{ borderWidth: 0 }}>
                    <SelectInput placeholder={t('settings.language')} className={themeClasses.text} />
                    <SelectIcon className="mr-3" as={ChevronDownIcon} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label={t('settings.languageNo') || 'Norsk'} value="no" />
                      <SelectItem label={t('settings.languageEn') || 'English'} value="en" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </HStack>
            </View>
          </Card>
        </View>

        {/* Connections Section */}
        <View style={styles.section}>
          <Heading className={`text-xs font-bold uppercase tracking-widest mb-3 ${themeClasses.textMuted}`}>
            {t("settings.gdpr").toUpperCase()}
          </Heading>
          <Card className={`p-0 overflow-hidden ${themeClasses.cardBg}`} style={styles.card}>
            <View style={styles.menuItemPadding}>
              <MenuRow 
                icon={Link2} 
                label={t("settings.sync")}
                value="Strava, Health"
                onPress={() => router.push("/(tabs)/settings/connected-apps")} 
              />
            </View>
          </Card>
        </View>

        {/* More Section */}
        <View style={styles.section}>
          <Heading className={`text-xs font-bold uppercase tracking-widest mb-3 ${themeClasses.textMuted}`}>
            {t("common.more")}
          </Heading>
          <Card className={`p-0 overflow-hidden ${themeClasses.cardBg}`} style={styles.card}>
            <View style={styles.menuItemPadding}>
              <MenuRow icon={Palette} label={t("settings.appearance")} onPress={() => router.push("/(tabs)/settings/appearance")} />
              <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />
              <MenuRow icon={Sliders} label={t("settings.preferences")} onPress={() => router.push("/(tabs)/settings/preferences")} />
              <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />
              <MenuRow icon={Shield} label={t("privacy.title")} onPress={() => router.push("/(tabs)/settings/privacy")} />
              <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />
              <MenuRow icon={Activity} label={t("settings.training")} onPress={() => router.push("/(tabs)/settings/training")} />
              <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />
              <MenuRow icon={Bell} label={t("notif.title")} onPress={() => router.push("/(tabs)/settings/notifications")} />
              <View style={flattenStyle([styles.divider, { backgroundColor: isDark ? "#1F2937" : "#E5E7EB" }])} />
              <MenuRow icon={HelpCircle} label={t("help.title")} onPress={() => router.push("/(tabs)/settings/help")} />
            </View>
          </Card>
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.section}>
            <Heading className={`text-xs font-bold uppercase tracking-widest mb-3 ${themeClasses.textMuted}`}>
              {t("settings.administrator")}
            </Heading>
            <Card className={`p-0 overflow-hidden ${themeClasses.cardBg}`} style={styles.card}>
              <View style={styles.menuItemPadding}>
                <HStack style={styles.menuItem}>
                  <HStack style={{ alignItems: "center", flex: 1 }}>
                    <View style={flattenStyle([styles.menuIconContainer, { backgroundColor: "#6366f115" }])}>
                      <ShieldAlert size={18} color="#6366f1" />
                    </View>
                    <Text className={`font-semibold text-sm ml-3 ${themeClasses.text}`}>{t("settings.adminMode")}</Text>
                  </HStack>
                  <Switch 
                    value={adminMode} 
                    onValueChange={handleAdminModeToggle}
                    trackColor={{ false: "#D1D5DB", true: "#6366f1" }}
                    thumbColor="#FFFFFF"
                  />
                </HStack>
              </View>
            </Card>
          </View>
        )}

        {/* Logout Section */}
        <View style={styles.section}>
          <Card className={`p-0 overflow-hidden ${themeClasses.cardBg}`} style={styles.card}>
            <View style={styles.menuItemPadding}>
              <MenuRow 
                icon={LogOut} 
                label={t("settings.signOut")}
                iconColor="#EF4444" 
                destructive
                showChevron={false}
                onPress={() => setShowLogoutAlertDialog(true)} 
              />
            </View>
          </Card>
        </View>

        <Text className={`text-center text-xs mt-4 mb-8 ${themeClasses.textMuted}`}>
          {t("settings.version")} 1.0.0 ({t("settings.build")} 42)
        </Text>
      </ScrollView>

      <AlertDialog
        isOpen={showLogoutAlertDialog}
        onClose={() => setShowLogoutAlertDialog(false)}
        useRNModal={Platform.OS !== "web"}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className={isDark ? "bg-background-900" : "bg-background-0"}>
          <AlertDialogHeader>
            <Heading size="md" className={themeClasses.text}>{t("settings.signOut")}</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className={themeClasses.textMuted}>
              {t("settings.signOutConfirm")}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter className="mt-4">
            <Button
              variant="outline"
              action="secondary"
              onPress={() => setShowLogoutAlertDialog(false)}
              className="mr-2"
            >
              <ButtonText>{t("common.cancel")}</ButtonText>
            </Button>
            <Button action="negative" onPress={handleLogout}>
              <ButtonText>{t("settings.signOut")}</ButtonText>
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
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  menuItemPadding: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
  },
});