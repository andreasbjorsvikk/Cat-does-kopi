import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationType = 'success' | 'warning' | 'error';

export const hapticsService = {
  async impact(style: ImpactStyle = 'medium'): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const expoStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[style];
      await Haptics.impactAsync(expoStyle);
    } catch (error) {
      console.warn('Haptics impact error:', error);
    }
  },

  async notification(type: NotificationType = 'success'): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const expoType = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      }[type];
      await Haptics.notificationAsync(expoType);
    } catch (error) {
      console.warn('Haptics notification error:', error);
    }
  },

  async selection(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptics selection error:', error);
    }
  },
};