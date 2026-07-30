import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { Home, Calendar, Mountain, Dumbbell, Users, Settings } from "lucide-react-native";
import useColorScheme from "@/hooks/useColorScheme";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Brand emerald/green color constants
  const activeColor = "#10B981"; // Emerald 500
  const inactiveColor = isDark ? "#9CA3AF" : "#6B7280"; // Gray 400 vs Gray 500
  const tabBgColor = isDark ? "#111827" : "#FFFFFF"; // Dark Gray 900 vs White
  const borderTopColor = isDark ? "#1F2937" : "#E5E7EB"; // Dark Gray 800 vs Gray 200

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarStyle: {
            backgroundColor: tabBgColor,
            borderTopColor: borderTopColor,
            borderTopWidth: 1,
            paddingTop: 5,
            paddingBottom: Platform.OS === "ios" ? 25 : 8,
            height: Platform.OS === "ios" ? 85 : 65,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Hjem",
            tabBarIcon: ({ color, size }) => <Home size={size || 24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Kalender",
            tabBarIcon: ({ color, size }) => <Calendar size={size || 24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Fjellkart",
            tabBarIcon: ({ color, size }) => <Mountain size={size || 24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: "Trening",
            tabBarIcon: ({ color, size }) => <Dumbbell size={size || 24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Fellesskap",
            tabBarIcon: ({ color, size }) => <Users size={size || 24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => <Settings size={size || 24} color={color} />,
          }}
        />
      </Tabs>
      <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 115 : 105, left: 10, zIndex: 1000 }}>
        <ThemeToggle />
      </View>
    </View>
  );
}