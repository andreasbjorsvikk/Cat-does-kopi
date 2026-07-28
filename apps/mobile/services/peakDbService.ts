import { supabase } from "@/lib/supabase";

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
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  route_start_lat?: number | null;
  route_start_lng?: number | null;
  route_geojson?: any | null;
  route_distance_m?: number | null;
  route_duration_s?: number | null;
  route_status?: string | null;
  route_waypoints?: any[] | null;
}

export interface Peak {
  id: string;
  name: string;
  heightMoh: number;
  latitude: number;
  longitude: number;
  area: string;
  municipality: string;
  county: string;
  description: string;
  imageUrl: string | null;
  isPublished: boolean;
  route_start_lat?: number | null;
  route_start_lng?: number | null;
  route_geojson?: any | null;
  route_distance_m?: number | null;
  route_duration_s?: number | null;
  route_waypoints?: any[] | null;
}

export function dbPeakToLegacy(p: DbPeak): Peak {
  return {
    id: p.id,
    name: p.name_no,
    heightMoh: p.elevation_moh,
    latitude: p.latitude,
    longitude: p.longitude,
    area: p.area,
    municipality: p.municipality || "",
    county: p.county || "",
    description: p.description_no || "",
    imageUrl: p.image_url,
    isPublished: p.is_published,
    route_start_lat: p.route_start_lat ?? undefined,
    route_start_lng: p.route_start_lng ?? undefined,
    route_geojson: p.route_geojson,
    route_distance_m: p.route_distance_m ?? undefined,
    route_duration_s: p.route_duration_s ?? undefined,
    route_waypoints: p.route_waypoints || undefined,
  };
}

export async function fetchPeaks(): Promise<Peak[]> {
  try {
    const { data, error } = await supabase
      .from("peaks_db")
      .select("*")
      .eq("is_published", true)
      .order("name_no");
    if (error) throw error;
    return (data || []).map(dbPeakToLegacy);
  } catch (error) {
    console.error("Could not fetch peaks from Supabase", error);
    throw error;
  }
}