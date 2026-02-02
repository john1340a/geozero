export interface CityEntry {
  nom: string;
  codeDepartement: string;
  centre: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
}

// Map: "normalized_city_name" -> CityEntry[]
// We use an array because multiple cities can have the same name (even in same dept sometimes, though rare for exact same name)
// Key format: "cityname" (lowercase, no accents)
const cityIndex = new Map<string, CityEntry[]>();
let isLoaded = false;
let initPromise: Promise<void> | null = null;

// Normalize string for consistent lookup (remove accents, lowercase, dashes)
const normalize = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
};

export const initCityDatabase = async () => {
  if (isLoaded) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
      try {
        console.log("Downloading French cities database...");
        const response = await fetch(
          "https://geo.api.gouv.fr/communes?fields=nom,codeDepartement,centre&format=json&geometry=centre"
        );
        
        if (!response.ok) throw new Error("Failed to fetch cities");
        
        const cities: CityEntry[] = await response.json();
        
        cities.forEach(city => {
          const key = normalize(city.nom);
          const existing = cityIndex.get(key) || [];
          existing.push(city);
          cityIndex.set(key, existing);
        });
        
        isLoaded = true;
        console.log(`City database loaded: ${cities.length} cities indexed.`);
      } catch (err) {
        console.error("Error loading city database:", err);
      }
  })();

  return initPromise;
};

export const lookupCity = (cityName: string, deptCode?: string): [number, number] | null => {
  if (!isLoaded || !cityName) return null;

  const key = normalize(cityName);
  const matches = cityIndex.get(key);

  if (!matches || matches.length === 0) return null;

  // If department code is provided, filter by it
  if (deptCode) {
    const deptMatch = matches.find(c => c.codeDepartement === deptCode);
    if (deptMatch && deptMatch.centre && deptMatch.centre.coordinates) {
        // geo.api.gouv.fr returns [lon, lat], we need [lat, lon]
        return [deptMatch.centre.coordinates[1], deptMatch.centre.coordinates[0]];
    }
  }

  // If no dept code or no match in that dept, return the first match (usually the most significant one if any logic existed, but here just first)
  // Or maybe we shouldn't return anything if ambiguous?
  // Let's be aggressive: if strict match by name fails, maybe we shouldn't guess wildy.
  // But if deptCode is MISSING from input, we return the first one.
  if (!deptCode) {
      const first = matches[0];
       if (first && first.centre && first.centre.coordinates) {
        return [first.centre.coordinates[1], first.centre.coordinates[0]];
    }
  }

  return null;
};
