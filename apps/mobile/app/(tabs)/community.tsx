import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Platform } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Users, Trophy, Award, Target, MessageSquare, Plus, CheckCircle2 } from "lucide-react-native";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";

export default function CommunityScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [activeTab, setActiveTab] = useState<"challenges" | "leaderboard" | "groups">("challenges");

  const themeClasses = {
    bg: isDark ? "bg-background-950" : "bg-background-0",
    text: isDark ? "text-typography-50" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    cardBg: isDark ? "bg-background-900 border-outline-800" : "bg-background-50 border-outline-100",
  };

  const mockLeaderboard = [
    { rank: 1, name: "Erik", sessions: 14, points: 280 },
    { rank: 2, name: "Meg", sessions: 11, points: 220 },
    { rank: 3, name: "Silje", sessions: 9, points: 180 },
    { rank: 4, name: "Magnus", sessions: 7, points: 140 },
    { rank: 5, name: "Lars", sessions: 4, points: 80 },
  ];

  const mockChallenges = [
    {
      id: "c1",
      name: "Mars-mila",
      metric: "Distanse (løping)",
      target: "100 km",
      progress: "42 km",
      participants: 4,
    },
    {
      id: "c2",
      name: "Ukens økter",
      metric: "Aktiviteter",
      target: "5 økter",
      progress: "3 økter",
      participants: 6,
    }
  ];

  const mockGroups = [
    { id: "g1", name: "Fjellgjengen", members: 12, desc: "For oss som elsker friluftsliv og toppturer i Jotunheimen" },
    { id: "g2", name: "Løpeklubben", members: 8, desc: "Intervaller og langkjøring i Oslo-området" },
  ];

  return (
    <ScrollView style={flattenStyle([styles.container, isDark ? styles.bgDark : styles.bgLight])} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <HStack style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Users size={20} color="#10B981" />
          </View>
          <VStack>
            <Heading className={`text-xl font-extrabold ${themeClasses.text}`}>Fellesskap</Heading>
            <Text className={`text-xs ${themeClasses.textMuted}`}>Tren sammen og motiver hverandre</Text>
          </VStack>
        </HStack>
      </View>

      {/* Sub tabs */}
      <HStack style={styles.tabContainer}>
        <TouchableOpacity 
          style={flattenStyle([styles.tabButton, activeTab === "challenges" && styles.tabButtonActive])}
          onPress={() => setActiveTab("challenges")}
        >
          <Text style={flattenStyle([styles.tabButtonText, activeTab === "challenges" ? styles.textWhite : { color: isDark ? "#9CA3AF" : "#4B5563" }])}>
            Utfordringer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={flattenStyle([styles.tabButton, activeTab === "leaderboard" && styles.tabButtonActive])}
          onPress={() => setActiveTab("leaderboard")}
        >
          <Text style={flattenStyle([styles.tabButtonText, activeTab === "leaderboard" ? styles.textWhite : { color: isDark ? "#9CA3AF" : "#4B5563" }])}>
            Toppliste
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={flattenStyle([styles.tabButton, activeTab === "groups" && styles.tabButtonActive])}
          onPress={() => setActiveTab("groups")}
        >
          <Text style={flattenStyle([styles.tabButtonText, activeTab === "groups" ? styles.textWhite : { color: isDark ? "#9CA3AF" : "#4B5563" }])}>
            Grupper
          </Text>
        </TouchableOpacity>
      </HStack>

      {/* Content Sections */}
      {activeTab === "challenges" && (
        <VStack style={styles.section} className="gap-4">
          {mockChallenges.map((challenge) => (
            <Card key={challenge.id} className={`p-4 ${themeClasses.cardBg}`} style={styles.itemCard}>
              <HStack style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <VStack style={{ flex: 1 }}>
                  <Text className={`font-bold text-base ${themeClasses.text}`}>{challenge.name}</Text>
                  <Text className={`text-xs ${themeClasses.textMuted}`}>{challenge.metric}</Text>
                </VStack>
                <View style={styles.participantsBadge}>
                  <Text className="text-emerald-500 text-xs font-bold">{challenge.participants} deltakere</Text>
                </View>
              </HStack>

              <HStack style={{ alignItems: "center", justifyContent: "space-between" }}>
                <Text className={`text-sm ${themeClasses.textMuted}`}>Mål: {challenge.target}</Text>
                <Text className="text-emerald-500 text-sm font-bold">Fremgang: {challenge.progress}</Text>
              </HStack>
              
              <View style={styles.progressBarBg}>
                <View style={flattenStyle([styles.progressBarFilled, { width: "42%" }])} />
              </View>
            </Card>
          ))}
          <TouchableOpacity style={styles.actionBtn}>
            <HStack style={{ alignItems: "center", justifyContent: "center" }}>
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Opprett ny utfordring</Text>
            </HStack>
          </TouchableOpacity>
        </VStack>
      )}

      {activeTab === "leaderboard" && (
        <VStack style={styles.section} className="gap-3">
          {mockLeaderboard.map((item) => (
            <Card key={item.rank} className={`p-4 ${themeClasses.cardBg}`} style={styles.itemCard}>
              <HStack style={{ alignItems: "center" }}>
                <View style={flattenStyle([
                  styles.rankBadge, 
                  item.rank === 1 ? { backgroundColor: "#F59E0B" } : item.rank === 2 ? { backgroundColor: "#9CA3AF" } : item.rank === 3 ? { backgroundColor: "#D97706" } : { backgroundColor: "#4B5563" }
                ])}>
                  <Text style={styles.rankText}>{item.rank}</Text>
                </View>
                <VStack style={{ flex: 1, marginLeft: 12 }}>
                  <Text className={`font-bold ${themeClasses.text}`}>{item.name}</Text>
                  <Text className={`text-xs ${themeClasses.textMuted}`}>{item.sessions} økter fullført</Text>
                </VStack>
                <HStack style={{ alignItems: "center" }}>
                  <Trophy size={16} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text className={`font-extrabold ${themeClasses.text}`}>{item.points} poeng</Text>
                </HStack>
              </HStack>
            </Card>
          ))}
        </VStack>
      )}

      {activeTab === "groups" && (
        <VStack style={styles.section} className="gap-4">
          {mockGroups.map((group) => (
            <Card key={group.id} className={`p-4 ${themeClasses.cardBg}`} style={styles.itemCard}>
              <HStack style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Heading className={`text-base font-bold ${themeClasses.text}`}>{group.name}</Heading>
                <Text className="text-emerald-500 text-xs font-semibold">{group.members} medlemmer</Text>
              </HStack>
              <Text className={`text-xs ${themeClasses.textMuted}`} style={{ marginBottom: 12 }}>{group.desc}</Text>
              <TouchableOpacity style={styles.joinBtn}>
                <Text style={styles.joinBtnText}>Bli med i gruppe</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </VStack>
      )}
    </ScrollView>
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
  tabContainer: {
    backgroundColor: "#E5E7EB30",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#10B981",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  textWhite: {
    color: "#FFFFFF",
  },
  section: {
    marginBottom: 20,
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
  },
  participantsBadge: {
    backgroundColor: "#10B98115",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  progressBarFilled: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  actionBtn: {
    backgroundColor: "#10B981",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  joinBtn: {
    borderWidth: 1,
    borderColor: "#10B981",
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  joinBtnText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
});