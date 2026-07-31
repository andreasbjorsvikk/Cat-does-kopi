import AsyncStorage from "@react-native-async-storage/async-storage";

const HEALTH_CONNECTION_KEY = 'apple_health_connected';

export const appleHealthService = {
  async getStatus(): Promise<{ connected: boolean }> {
    const connected = await AsyncStorage.getItem(HEALTH_CONNECTION_KEY);
    return { connected: connected === 'true' };
  },

  async connect(): Promise<{ ok: boolean }> {
    // In a real app, this would trigger native HealthKit permissions
    await AsyncStorage.setItem(HEALTH_CONNECTION_KEY, 'true');
    return { ok: true };
  },

  async disconnect(): Promise<{ ok: boolean }> {
    await AsyncStorage.setItem(HEALTH_CONNECTION_KEY, 'false');
    return { ok: true };
  }
};