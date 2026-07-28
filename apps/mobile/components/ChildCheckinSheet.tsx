import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Actionsheet, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetBackdrop } from '@/components/ui/actionsheet';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { getChildProfiles, getSharedChildProfiles, ChildProfile } from '@/services/childProfileService';
import { checkinPeak, checkinChild, uploadCheckinImage } from '@/services/peakCheckinService';
import { enqueue } from '@/services/syncQueue';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Check, Trash2, Users, User, Baby } from 'lucide-react-native';
import useColorScheme from '@/hooks/useColorScheme';

interface ChildCheckinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  peakId: string;
  peakName: string;
  userId: string;
  username: string;
  userAvatarUrl: string | null;
  onSuccess: (checkedInNames: string[], imageUrl: string | null) => void;
}

export function ChildCheckinSheet({
  isOpen,
  onClose,
  peakId,
  peakName,
  userId,
  username,
  userAvatarUrl,
  onSuccess,
}: ChildCheckinSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set([userId])); // Parent is selected by default
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadChildren();
    }
  }, [isOpen, userId]);

  const loadChildren = async () => {
    setLoadingChildren(true);
    try {
      const [owned, shared] = await Promise.all([
        getChildProfiles(userId),
        getSharedChildProfiles(userId),
      ]);
      setChildren([...owned, ...shared]);
    } catch (err) {
      console.error('Kunne ikke laste barneprosjekter:', err);
    } finally {
      setLoadingChildren(false);
    }
  };

  const toggleSelect = (id: string) => {
    const updated = new Set(selectedUserIds);
    if (updated.has(id)) {
      if (updated.size > 1) {
        updated.delete(id);
      } else {
        Alert.alert('Innsjekk', 'Du må velge minst én person å sjekke inn.');
      }
    } else {
      updated.add(id);
    }
    setSelectedUserIds(updated);
  };

  const handleTakePhoto = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Tilgang', 'Du må tillate tilgang til kamera for å ta bilde.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePickPhoto = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Tilgang', 'Du må tillate tilgang til bildegalleriet for å velge bilde.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCheckin = async () => {
    if (selectedUserIds.size === 0) {
      Alert.alert('Innsjekk', 'Du må velge minst én person å sjekke inn.');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrl: string | null = null;
      if (imageUri) {
        uploadedUrl = await uploadCheckinImage(imageUri, userId);
      }

      const checkedInNames: string[] = [];
      const timestamp = new Date().toISOString();

      for (const id of selectedUserIds) {
        const isSelf = id === userId;
        const child = children.find((c) => c.id === id);
        const name = isSelf ? username : (child ? child.name : 'Barn');
        checkedInNames.push(name);

        try {
          if (isSelf) {
            await checkinPeak(userId, peakId, timestamp, uploadedUrl);
          } else {
            await checkinChild(userId, id, peakId, uploadedUrl || undefined);
          }
        } catch (onlineErr: any) {
          // If offline or cooldown error, enqueue to sync queue
          if (onlineErr.message && onlineErr.message.includes('Du har allerede sjekket inn')) {
            throw onlineErr; // Don't queue cooldown errors
          }
          console.log(`Fallback for ${name} to offline sync queue:`, onlineErr);
          await enqueue('peak_checkins', 'insert', {
            user_id: id,
            peak_id: peakId,
            verified: true,
            checked_in_by: isSelf ? null : userId,
            image_url: uploadedUrl || imageUri || null,
            checked_in_at: timestamp,
          });
        }
      }

      Alert.alert(
        'Innsjekk vellykket!',
        `Sjekket inn på ${peakName} for:\n${checkedInNames.join(', ')}`
      );
      
      onSuccess(checkedInNames, uploadedUrl || imageUri);
      setImageUri(null);
      setSelectedUserIds(new Set([userId]));
      onClose();
    } catch (err: any) {
      Alert.alert('Innsjekk feilet', err.message || 'Noe gikk galt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent style={styles.sheetContent}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <Heading size="lg" className="text-center text-typography-900 mt-2">
            Innsjekk på {peakName}
          </Heading>
          <Text size="sm" className="text-center text-typography-500 mb-6 mt-1">
            Velg hvem som skal sjekke inn sammen med deg
          </Text>

          {/* People Selection */}
          <Heading size="xs" className="text-typography-600 mb-2 uppercase tracking-wider font-semibold">
            Hvem er med på tur?
          </Heading>

          {/* Parent Option */}
          <TouchableOpacity
            style={[
              styles.personRow,
              { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
              selectedUserIds.has(userId) && styles.personRowSelected,
            ]}
            onPress={() => toggleSelect(userId)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarPlaceholder}>
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} style={styles.avatarImg} />
              ) : (
                <User size={20} color={selectedUserIds.has(userId) ? '#10B981' : '#9CA3AF'} />
              )}
            </View>
            <View style={styles.personInfo}>
              <Text className="font-semibold text-typography-900">{username}</Text>
              <Text size="xs" className="text-typography-500">Meg (deg selv)</Text>
            </View>
            <View style={[styles.checkbox, selectedUserIds.has(userId) && styles.checkboxSelected]}>
              {selectedUserIds.has(userId) && <Check size={14} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          {/* Children Options */}
          {loadingChildren ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 16 }} />
          ) : children.length > 0 ? (
            children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.personRow,
                  { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
                  selectedUserIds.has(child.id) && styles.personRowSelected,
                ]}
                onPress={() => toggleSelect(child.id)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarPlaceholder}>
                  {child.avatar_url ? (
                    <Image source={{ uri: child.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <Text size="lg">{child.emoji || '👶'}</Text>
                  )}
                </View>
                <View style={styles.personInfo}>
                  <Text className="font-semibold text-typography-900">{child.name}</Text>
                  <Text size="xs" className="text-typography-500">Barn</Text>
                </View>
                <View style={[styles.checkbox, selectedUserIds.has(child.id) && styles.checkboxSelected]}>
                  {selectedUserIds.has(child.id) && <Check size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noChildrenBox}>
              <Baby size={20} color={isDark ? '#4B5563' : '#9CA3AF'} />
              <Text size="xs" className="text-typography-400 mt-1 text-center">
                Ingen registrerte barn. Du kan legge til barn under fellesskaps- eller innstillinger-skjermen.
              </Text>
            </View>
          )}

          {/* Image Selection */}
          <Heading size="xs" className="text-typography-600 mb-2 mt-6 uppercase tracking-wider font-semibold">
            Legg til et bilde (valgfritt)
          </Heading>

          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mediaButtons}>
              <TouchableOpacity
                style={[styles.mediaButton, { borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <Camera size={20} color="#10B981" />
                <Text size="sm" className="font-medium text-typography-800 ml-2">Ta bilde</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaButton, { borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={handlePickPhoto}
                activeOpacity={0.7}
              >
                <ImageIcon size={20} color="#10B981" />
                <Text size="sm" className="font-medium text-typography-800 ml-2">Velg fra galleri</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Checkin Action Buttons */}
          <View style={styles.actions}>
            <Button
              onPress={handleCheckin}
              disabled={submitting}
              className="bg-emerald-500 data-[hover=true]:bg-emerald-600 data-[active=true]:bg-emerald-700 dark:bg-emerald-600 dark:data-[hover=true]:bg-emerald-700 dark:data-[active=true]:bg-emerald-800 w-full rounded-xl py-3"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ButtonText className="text-white font-bold text-base">Registrer innsjekk</ButtonText>
              )}
            </Button>
          </View>
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    maxHeight: '90%',
  },
  scrollContainer: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  personRowSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  personInfo: {
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  noChildrenBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePreviewContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    borderStyle: 'dashed',
  },
  actions: {
    marginTop: 20,
  },
});