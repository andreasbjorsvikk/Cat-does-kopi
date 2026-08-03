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
import { useLanguage } from '@/context/LanguageContext';

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
  const { t } = useLanguage();
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
      console.error('Could not load child profiles:', err);
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
        Alert.alert(t('map.checkin'), t('map.selectAtLeastOne') || 'Du må velge minst én person å sjekke inn.');
      }
    } else {
      updated.add(id);
    }
    setSelectedUserIds(updated);
  };

  const handleTakePhoto = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert(t('common.error'), t('map.locationDenied'));
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
      Alert.alert(t('common.error'), t('map.locationDenied'));
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
    // If a photo is taken, ensure parent is checked in to lay the image on parent's row
    const idsToCheckIn = new Set(selectedUserIds);
    if (imageUri && !idsToCheckIn.has(userId)) {
      idsToCheckIn.add(userId);
    }

    if (idsToCheckIn.size === 0) {
      Alert.alert(t('map.checkin'), t('map.selectAtLeastOne') || 'Du må velge minst én person å sjekke inn eller ta et bilde.');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrl: string | null = null;
      if (imageUri) {
        uploadedUrl = await uploadCheckinImage(imageUri, userId, peakId);
      }

      const successNames: string[] = [];
      const failedNames: { name: string; error: string }[] = [];
      const timestamp = new Date().toISOString();

      for (const id of idsToCheckIn) {
        const isSelf = id === userId;
        const child = children.find((c) => c.id === id);
        const name = isSelf ? username : (child ? child.name : 'Barn');

        try {
          if (isSelf) {
            await checkinPeak(userId, peakId, timestamp, uploadedUrl);
          } else {
            await checkinChild(userId, id, peakId);
          }
          successNames.push(name);
        } catch (onlineErr: any) {
          const errMsg = onlineErr.message || '';
          const isCooldown = errMsg.includes('allerede sjekket inn') || errMsg.includes('cooldown');

          failedNames.push({ name, error: onlineErr.message || t('common.unknown') });
        }
      }

      if (successNames.length > 0) {
        let msg = t('map.checkinSuccess') + ` (${peakName})\n${successNames.join(', ')}`;
        if (failedNames.length > 0) {
          msg += `\n\n${t('common.error')}:\n${failedNames.map(f => `${f.name}: ${f.error}`).join('\n')}`;
        }
        Alert.alert(t('map.checkin'), msg);
        onSuccess(successNames, uploadedUrl || imageUri);
        setImageUri(null);
        setSelectedUserIds(new Set([userId]));
        onClose();
      } else {
        const errorMsg = failedNames.map(f => `${f.name}: ${f.error}`).join('\n');
        Alert.alert(t('map.checkinError'), errorMsg);
      }
    } catch (err: any) {
      Alert.alert(t('map.checkinError'), err.message || t('common.unknown'));
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
            {t('map.checkin')} - {peakName}
          </Heading>
          <Text size="sm" className="text-center text-typography-500 mb-6 mt-1">
            {t('map.checkinDesc')}
          </Text>

          {/* People Selection */}
          <Heading size="xs" className="text-typography-600 mb-2 uppercase tracking-wider font-semibold">
            {t('map.whoIsWithYou')}
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
              <Text size="xs" className="text-typography-500">{t('common.me')}</Text>
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
                  <Text size="xs" className="text-typography-500">{t('privacy.children')}</Text>
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
                {t('map.noChildren')}
              </Text>
            </View>
          )}

          {/* Image Selection */}
          <Heading size="xs" className="text-typography-600 mb-2 mt-6 uppercase tracking-wider font-semibold">
            {t('map.addImage')}
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
                <Text size="sm" className="font-medium text-typography-800 ml-2">{t('map.takePhoto')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaButton, { borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={handlePickPhoto}
                activeOpacity={0.7}
              >
                <ImageIcon size={20} color="#10B981" />
                <Text size="sm" className="font-medium text-typography-800 ml-2">{t('map.pickGallery')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Checkin Action Buttons */}
          <View style={styles.actions}>
            <Button
              onPress={handleCheckin}
              disabled={submitting}
              className="bg-emerald-500 data-[hover=true]:bg-emerald-600 data-[active=true]:bg-emerald-700 dark:bg-emerald-600 dark:data-[hover=true]:bg-emerald-700 dark:data-[active=true]:bg-emerald-800 w-full rounded-xl py-4 h-14"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ButtonText className="text-white font-bold text-base">{t('map.checkin')}</ButtonText>
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