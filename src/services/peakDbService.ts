import { supabase } from '@/integrations/supabase/client';

export interface DbPeak {
  id: string;
  name_no: string;
  elevation_moh: number;
  area: string;
  municipality: string;
  county: string;
  description_no: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  route_start_lat: number | null;
  route_start_lng: number | null;
  route_geojson: any | null;
  route_distance_m: number | null;
  route_duration_s: number | null;
  route_status: string | null;
  route_waypoints: any[] | null;
}

// Convert DB peak to the Peak interface used by map components
export function dbPeakToLegacy(p: DbPeak) {
  return {
    id: p.id,
    name: p.name_no,
    heightMoh: p.elevation_moh,
    latitude: p.latitude,
    longitude: p.longitude,
    area: p.area,
    municipality: p.municipality || '',
    county: p.county || '',
    description: p.description_no || '',
    imageUrl: p.image_url,
    isPublished: p.is_published,
    route_start_lat: p.route_start_lat,
    route_start_lng: p.route_start_lng,
    route_geojson: p.route_geojson,
    route_distance_m: p.route_distance_m,
    route_duration_s: p.route_duration_s,
    route_status: p.route_status,
    route_waypoints: p.route_waypoints,
  };
}

export async function fetchPeaks(): Promise<DbPeak[]> {
  const { data, error } = await supabase
    .from('peaks_db' as any)
    .select('*')
    .order('name_no');
  if (error) throw error;
  return (data || []) as unknown as DbPeak[];
}

export async function createPeak(peak: Omit<DbPeak, 'id' | 'created_at' | 'updated_at'>): Promise<DbPeak> {
  const { data, error } = await supabase
    .from('peaks_db' as any)
    .insert(peak as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DbPeak;
}

export async function updatePeak(id: string, patch: Partial<DbPeak>): Promise<DbPeak> {
  const { data, error } = await supabase
    .from('peaks_db' as any)
    .update(patch as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DbPeak;
}

export async function deletePeak(id: string): Promise<void> {
  const { error } = await supabase
    .from('peaks_db' as any)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Long-lived signed URL (5 years) — bucket is private, signed URLs are how we serve files.
const PEAK_IMAGE_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5;

export async function uploadPeakImage(peakId: string, file: File): Promise<string> {
  const path = `${peakId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('peak-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from('peak-images')
    .createSignedUrl(path, PEAK_IMAGE_URL_TTL_SECONDS);
  if (signErr || !data) throw signErr ?? new Error('Failed to sign peak image URL');
  return data.signedUrl;
}
