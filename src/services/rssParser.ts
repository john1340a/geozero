import { XMLParser } from "fast-xml-parser";
import type { JobOffer, RSSItem } from "../types/job";

export const parseRSS = async (): Promise<JobOffer[]> => {
  try {
    // Use proxy endpoint with timestamp to prevent caching
    const response = await fetch(`/api/rss?t=${Date.now()}`);
    const text = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
    });
    const result = parser.parse(text);
    
    // Handle single item vs array of items
    const channelItems = result.rss.channel.item;
    const items: RSSItem[] = Array.isArray(channelItems) ? channelItems : [channelItems];

    return items.map((item) => {
      const { title, link, description, pubDate, guid } = item;
      const { type, cleanTitle, city, department } = parseTitle(title);

      return {
        id: (guid as any)?.['#text'] || link,
        title: cleanTitle,
        type,
        city: city || "",
        department: department || "",
        description: description || "",
        link,
        pubDate,
        company: item["dc:creator"],
      };
    });
  } catch (error) {
    console.error("Error parsing RSS:", error);
    return [];
  }
};

const parseTitle = (rawTitle: string) => {
  // Regex to match: [Type] Title - City (Dept)
  // Supports:
  // [Stage] Dev - Paris (75)
  // [CDI] Ingénieur - Lyon
  // [CDD] Data (31) -- No city
  // [CDI] Ingénieur Bourges (18)  -- No separator
  
  // 1. Extract Type [ ... ] or match keywords
  let type = "Autre";

  // Helper to detect type from a string
  const detectType = (str: string): string | null => {
    const s = str.toLowerCase();
    if (s.includes("stage")) return "Stage";
    if (s.includes("cdd")) return "CDD";
    if (s.includes("cdi")) return "CDI";
    if (s.includes("alternance") || s.includes("apprentissage") || s.includes("contrat pro")) return "Alternance";
    if (s.includes("thèse") || s.includes("these")) return "Thèse";
    if (s.includes("freelance") || s.includes("indépendant")) return "Freelance";
    if (s.includes("intérim") || s.includes("interim")) return "Intérim";
    return null;
  };

  // First try to analyze what's inside brackets [ ... ]
  const bracketMatch = rawTitle.match(/^\[(.*?)\]/);
  if (bracketMatch) {
    const bracketContent = bracketMatch[1];
    // Check if bracket content contains a known type
    const detected = detectType(bracketContent);
    if (detected) {
      type = detected;
    } else {
      // If brackets exist but no keyword found (e.g. [Urgent]), usually keep as is or ignore?
      // Let's fallback to searching the whole title if bracket didn't yield a known type
      // Or assume the bracket IS the type but messy?
      // User said "saisir [CDD 18 mois]". detectType("CDD 18 mois") returns "CDD". So it works.
      // If user types "[Offre]", detectType returns null.
      // In that case, we should probably search the Rest of the title.
      // But for now, let's stick to: if brackets have a type, use it.
      // If not, maybe use the bracket content as custom type? Or fallback to Autre?
      // Let's fallback to full title search if bracket search fails.
       const titleDetected = detectType(rawTitle);
       if (titleDetected) type = titleDetected;
       // Else remain "Autre" (or bracket content? No, normalized types are better).
    }
  } else {
    // No brackets, search full title
    const detected = detectType(rawTitle);
    if (detected) type = detected;
  }
  
  // Remove type tag from string (only if it was in brackets at start)
  let remainder = rawTitle.replace(/^\[(.*?)\]\s*/, "");

  let department = "";
  let city = "";

  // 2. Extract Department (##) at the end
  const deptMatch = remainder.match(/\((\d{2,3}|2A|2B)\)\s*$/);
  if (deptMatch) {
    department = deptMatch[1];
    remainder = remainder.replace(/\((\d{2,3}|2A|2B)\)\s*$/, "").trim();
  }

  // 3. Extract City
  // Normalize dashes (em-dash, en-dash to hyphen)
  remainder = remainder.replace(/–|—/g, "-");

  const lastDashIndex = remainder.lastIndexOf(" - ");
  
  if (lastDashIndex > -1) {
    // Standard Case: Title - City
    city = remainder.substring(lastDashIndex + 3).trim();
    remainder = remainder.substring(0, lastDashIndex).trim();
  } else {
    // No separator case: "Ingénieur Bourges" (after dept removal)
    // Heuristic: If we found a Department, the last part of the string might be the city.
    // We look for the last 'phrase' that looks like a city (Capitalized).
    // This is tricky. 
    // Example: "Chargé de mission SIG Roanne" -> "Roanne"
    // Example: "Technicien rivière" -> No city
    
    // If specific words are found at the end that are definitely NOT cities, we ignore.
    // But simplified fallback: If we have a Dept, and the text ends with a Capitalized word, take it.
    if (department) {
        // Regex for Last Word(s) starting with Uppercase
        // e.g. "Roanne" or "Le Havre" or "Saint-Etienne"
        // Match standard French city names: Uppercase, maybe dashes/spaces, then end.
        const potentialCityMatch = remainder.match(/([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:[\s-][A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+)*)$/);
        
        if (potentialCityMatch) {
            const potentialCity = potentialCityMatch[1];
            // Safety check: Don't extract if it looks like part of the title common words
            // e.g. "SIG", "Chef", etc. if they are at the end.
            // But usually titles don't end with a Capitalized City unless it IS a city.
            // Exception: "Technicien SIG". SIG is caps.
            // My regex requires [A-Z][a-z]... so standard MixedCase. "SIG" (all caps) won't match.
            // "Chef de Projet" -> "Projet" matches. Risk!
            
            // To be safe: Only extract if user explicitly looks for this pattern?
            // User said: "Bourges (18)".
            // Let's assume if it is "Word (Code)", "Word" is the city.
            // But if it is "Chef de Projet (Code)", "Projet" is not a city.
            
            // Refinement: Only extract if it doesn't look like a common job word.
            const commonJobWords = ["Projet", "Mission", "Etudes", "Travaux", "Developpement", "Service", "Donnees"];
            if (!commonJobWords.includes(potentialCity)) {
                 city = potentialCity;
                 // Remove city from title
                 remainder = remainder.substring(0, remainder.length - city.length).trim();
            }
        }
    }
  }

  return {
    type,
    cleanTitle: remainder,
    city,
    department
  };
};
