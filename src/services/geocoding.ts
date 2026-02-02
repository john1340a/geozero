import { lookupCity, initCityDatabase } from './cityDatabase';
import { DEPARTMENT_DATA } from './departmentData';

// Geocoding using Nominatim API (Fallback)
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const cache = new Map<string, [number, number]>();
const CACHE_KEY = "geo_cache_v3";

// Load cache from localStorage
try {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    for (const key in parsed) {
      cache.set(key, parsed[key]);
    }
  }
} catch {
  console.warn("Failed to load geo cache");
}

const saveCache = () => {
    try {
        const obj = Object.fromEntries(cache);
        localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    } catch {
        // ignore
    }
}

// Re-export DEPARTMENTS for UI components (backward compatibility)
export const DEPARTMENTS: Record<string, string> = Object.fromEntries(
  Object.entries(DEPARTMENT_DATA).map(([code, info]) => [code, info.name])
);

// Initialize DB (can be called multiple times, handles itself)
export const ensureDatabaseLoaded = async () => {
    return initCityDatabase();
};

export const geocodeLocation = async (city: string, dept: string): Promise<[number, number] | null> => {
  // 1. Try Instant Local Lookup first (Zero Latency)
  if (city) {
      const localCoords = lookupCity(city, dept);
      if (localCoords) {
          return localCoords;
      }
  }

  // 2. Fallback: Check if Department Code exists and return Dept Center instantly
  // This handles cases where City might be empty, or City is actually a region name like "Loire-Atlantique"
  // or City is "Unknown".
  // If we have a valid Dept Code, we can safely place the point in the department center.
  if (dept && DEPARTMENT_DATA[dept.padStart(2, '0')]) {
      // Logic:
      // If city was provided but not found locally (e.g. "Lieu-dit Paumé"), do we query API or just use Dept Center?
      // User complaint: "It is slow". Querying API is slow.
      // If we blindly fallback to Dept Center, we lose precision but gain massive speed.
      // Compromise: If city looks like a real city (not empty), we *could* try API.
      // BUT if the parser put a Region Name (e.g. "Loire" or "Rhone") as the city, API is bad.
      
      // Let's optimize for speed as requested.
      // If Local Lookup FAILED, and we have a Dept Code, use Dept Center first?
      // Maybe trigger background refinement? No, too complex.
      
      // Heuristic: If city name matches Department Name, definitely use Center.
      const deptInfo = DEPARTMENT_DATA[dept.padStart(2, '0')];
      
      if (city && deptInfo.name.toLowerCase() === city.toLowerCase()) {
         return deptInfo.center;
      }

      // If city is empty, definitely use Center.
      if (!city) {
        return deptInfo.center;
      }
      
      // If City is NOT empty but not found locally.
      // e.g. "Paris 12e". Local DB has "Paris".
      // Try to clean/fuzzy match?
      // Or just fallback to Dept Center to be SAFE and FAST?
      // "Paris 12e" -> Dept 75 -> Center of Paris. Accurate enough!
      // "Lieu-dit X" (Dept 29) -> Center of Finistere. Acceptable for a map overview?
      // YES. User wants speed.
      
      return deptInfo.center;
  }

  // 3. Last Resort: Nominatim API
  let query = "";
  
  if (dept) {
      const deptInfo = DEPARTMENT_DATA[dept.padStart(2, '0')];
      const deptName = deptInfo ? deptInfo.name : dept;
      
      if (city) {
        query = `${city}, ${deptName}, France`;
      } else {
        query = `${deptName}, France`;
      }
  } else if (city) {
      query = `${city}, France`;
  }
  
  if (!query || query === ', France') return null;
  
  return geocodeQuery(query);
};

export const geocodeQuery = async (query: string): Promise<[number, number] | null> => {
    if (!query || query.length < 2) return null;
    
    // Check cache
    if (cache.has(query)) {
        return cache.get(query)!;
    }

    try {
        // Rate limiting
        await new Promise(r => setTimeout(r, 200));

        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'fr'
        });

        const res = await fetch(`${NOMINATIM_URL}?${params}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'GeoRezoJobMap/1.0'
            }
        });

        if (!res.ok) {
            console.warn(`Geocoding failed for "${query}": ${res.status}`);
            return null;
        }

        const data = await res.json();

        if (data && data.length > 0) {
            const coords: [number, number] = [
                parseFloat(data[0].lat), 
                parseFloat(data[0].lon)
            ];
            cache.set(query, coords);
            saveCache();
            return coords;
        }
    } catch (err) {
        console.error(`Geocoding error for "${query}":`, err);
    }

    return null;
};

// Search for cities - returns list of city suggestions
export interface CityResult {
  name: string;
  displayName: string;
  coordinates: [number, number];
}

export const searchCities = async (query: string): Promise<CityResult[]> => {
    if (!query || query.length < 2) return [];

    try {
        await new Promise(r => setTimeout(r, 100));

        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '5',
            countrycodes: 'fr',
            addressdetails: '1'
        });

        const res = await fetch(`${NOMINATIM_URL}?${params}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'GeoRezoJobMap/1.0'
            }
        });

        if (!res.ok) return [];

        const data = await res.json();

        const seen = new Set<string>();
        return data.map((item: any) => ({
            name: item.address?.city || item.address?.town || item.address?.village || item.name,
            displayName: item.display_name,
            coordinates: [parseFloat(item.lat), parseFloat(item.lon)] as [number, number]
        }))
        .filter((c: CityResult) => {
            if (!c.name || seen.has(c.name)) return false;
            seen.add(c.name);
            return true;
        });
    } catch {
        return [];
    }
};
