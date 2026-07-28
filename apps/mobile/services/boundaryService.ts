import { Platform } from 'react-native';

const CACHE: Record<string, any> = {};

export async function fetchBoundary(type: 'fylke' | 'kommune', id: string) {
  const cacheKey = `${type}-${id}`;
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  const endpoint = type === 'fylke' 
    ? `https://ws.geonorge.no/kommuneinfo/v1/fylker/${id}/omrade`
    : `https://ws.geonorge.no/kommuneinfo/v1/kommuner/${id.replace('k', '')}/omrade`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch boundary: ${response.statusText}`);
    }
    const data = await response.json();
    CACHE[cacheKey] = data;
    return data;
  } catch (error) {
    console.error(`Error fetching ${type} boundary for ${id}:`, error);
    return null;
  }
}