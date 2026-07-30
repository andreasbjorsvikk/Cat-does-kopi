import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity 
      style={styles.themeToggle} 
      onPress={toggleColorScheme}
      activeOpacity={0.8}
    >
      <View style={[
        styles.themeToggleBtn, 
        { 
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF', 
          borderColor: isDark ? '#374151' : '#E5E7EB' 
        }
      ]}>
        {isDark ? (
          <Sun size={20} color="#FFFFFF" />
        ) : (
          <Moon size={20} color="#111827" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  themeToggle: {
  },
  themeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});