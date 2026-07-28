import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export interface PeakCheckin {
  id: string;
  user_id: string;
  peak_id: string;
  checked_in_at: string;
  verified: boolean;
  activity_id: string | null;
  image_url?: string | null;
  checked_in_by?: string | null;
}

export interface CheckinWithProfile extends PeakCheckin {
  profiles?: { username: string | null; avatar_url: string | null } | null;
  peaks_db?: { name: string } | null;
}

const CHECKIN_COOLDOWN_MS = 3 * 60 * 60 * 1000;

/**
 * SUPABASE RLS POLICIES ADVICE:
 * 
 * For the 'peak_checkins' table:
 * 1. SELECT policy: Allow all authenticated users to read.
 *    CREATE POLICY "Allow public read access to peak checkins" ON peak_checkins FOR SELECT TO authenticated USING (true);
 * 2. INSERT policy: Allow authenticated users to insert their own check-ins or parent check-ins for their children.
 *    CREATE POLICY "Allow users to insert checkins" ON peak_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR auth.uid() = checked_in_by);
 * 3. UPDATE policy: Allow users to edit their own/child's check-ins within 24 hours.
 *    CREATE POLICY "Allow users to update checkins" ON peak_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = checked_in_by);
 * 4. DELETE policy: Allow users to delete their own/child's check-ins within 24 hours.
 *    CREATE POLICY "Allow users to delete checkins" ON peak_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = checked_in_by);
 * 
 * For the 'peak-images' Storage Bucket:
 * 1. SELECT policy: Give public read access.
 *    CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'peak-images');
 * 2. INSERT/UPDATE policy: Allow authenticated users to upload files to folders matching their user ID.
 *    CREATE POLICY "Allow users to upload peak images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'peak-images' AND (storage.foldername(name))[1] = auth.uid()::text);
 */

export async function getUserCheckins(userId: string): Promise<PeakCheckin[]> {
  const { data, error } = await supabase
    .from('peak_checkins')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as unknown as PeakCheckin[];
}

export async function hasCheckinCooldown(userId: string, peakId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('peak_checkins')
    .select('checked_in_at')
    .eq('user_id', userId)
    .eq('peak_id', peakId)
    .order('checked_in_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return false;
  
  const lastCheckinTime = new Date(data[0].checked_in_at).getTime();
  const elapsed = Date.now() - lastCheckinTime;
  return elapsed < CHECKIN_COOLDOWN_MS;
}

export async function findDuplicateCheckin(
  userId: string,
  peakId: string,
  checkedInAt: string
): Promise<PeakCheckin | null> {
  const dateToCheck = checkedInAt;
  const minTime = new Date(new Date(dateToCheck).getTime() - 2 * 60 * 1000).toISOString();
  const maxTime = new Date(new Date(dateToCheck).getTime() + 2 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('peak_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('peak_id', peakId)
    .gte('checked_in_at', minTime)
    .lte('checked_in_at', maxTime)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PeakCheckin;
}

export async function checkinPeak(
  userId: string,
  peakId: string,
  checkedInAt?: string,
  imageUrl?: string | null,
  checkedInBy?: string | null
): Promise<PeakCheckin> {
  const dateToCheck = checkedInAt || new Date().toISOString();

  // Idempotency check: check if a check-in already exists in ±2 minutes interval
  const existing = await findDuplicateCheckin(userId, peakId, dateToCheck);
  if (existing) {
    return existing as unknown as PeakCheckin;
  }

  // Check cooldown if not already checked in
  const onCooldown = await hasCheckinCooldown(userId, peakId);
  if (onCooldown) {
    throw new Error("Du har allerede sjekket inn på denne toppen i løpet av de siste 3 timene.");
  }

  const payload: any = {
    user_id: userId,
    peak_id: peakId,
    verified: true,
    checked_in_by: checkedInBy || null,
    checked_in_at: dateToCheck
  };
  
  if (imageUrl) {
    payload.image_url = imageUrl;
  }
  
  const { data, error } = await supabase
    .from('peak_checkins')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PeakCheckin;
}

export async function checkinChild(
  parentId: string,
  childId: string,
  peakId: string,
  imageUrl?: string
): Promise<PeakCheckin> {
  // Since child's check-in shouldn't have image ("lay the image on parent's row"), we pass null for imageUrl to the child checkin
  return checkinPeak(childId, peakId, new Date().toISOString(), null, parentId);
}

export async function deleteCheckin(checkinId: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('peak_checkins')
    .select('checked_in_at')
    .eq('id', checkinId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!data) throw new Error("Innsjekk ikke funnet.");
  
  const checkedInAt = new Date(data.checked_in_at).getTime();
  const elapsed = Date.now() - checkedInAt;
  if (elapsed > 24 * 60 * 60 * 1000) {
    throw new Error("Du kan bare slette innsjekker som er mindre enn 24 timer gamle.");
  }
  
  const { error } = await supabase
    .from('peak_checkins')
    .delete()
    .eq('id', checkinId);
    
  if (error) throw error;
}

export async function updateCheckinImage(checkinId: string, imageUrl: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('peak_checkins')
    .select('checked_in_at')
    .eq('id', checkinId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!data) throw new Error("Innsjekk ikke funnet.");
  
  const checkedInAt = new Date(data.checked_in_at).getTime();
  const elapsed = Date.now() - checkedInAt;
  if (elapsed > 24 * 60 * 60 * 1000) {
    throw new Error("Du kan bare redigere bilder på innsjekker som er mindre enn 24 timer gamle.");
  }
  
  const { error } = await supabase
    .from('peak_checkins')
    .update({ image_url: imageUrl })
    .eq('id', checkinId);
    
  if (error) throw error;
}

export async function uploadCheckinImage(
  imageUri: string,
  userId: string,
  peakId: string,
  base64Data?: string
): Promise<string | null> {
  try {
    let binaryData: File | Uint8Array;
    let fileName: string;
    let contentType: string;
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    fileName = `${userId}/${peakId}/${Date.now()}.${ext}`;

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        contentType = blob.type || contentType;
        binaryData = new File([blob], fileName.split('/').pop()!, { type: contentType });
      } catch (fetchErr) {
        if (base64Data) {
          const fallbackBlob = new Blob([decode(base64Data)], { type: contentType });
          binaryData = new File([fallbackBlob], fileName.split('/').pop()!, { type: contentType });
        } else {
          throw fetchErr;
        }
      }
    } else {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      binaryData = new Uint8Array(decode(base64));
    }

    const { data, error } = await supabase.storage
      .from('peak-images')
      .upload(fileName, binaryData, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    // Get signed URL for 5 years (157,680,000 seconds)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('peak-images')
      .createSignedUrl(data.path, 157680000);

    if (signedError) throw signedError;
    return signedData.signedUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}

export async function getAllCheckinsForPeak(peakId: string): Promise<CheckinWithProfile[]> {
  const { data: checkins, error } = await supabase
    .from('peak_checkins')
    .select('*')
    .eq('peak_id', peakId)
    .order('checked_in_at', { ascending: false });
  if (error) throw error;
  
  if (!checkins || checkins.length === 0) return [];
  
  const userIds = [...new Set(checkins.map((c: any) => c.user_id))];
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);
  if (profilesError) throw profilesError;
  
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  
  return checkins.map((checkin: any) => ({
    ...checkin,
    profiles: profileMap.get(checkin.user_id) || null
  })) as CheckinWithProfile[];
}

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of the earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}