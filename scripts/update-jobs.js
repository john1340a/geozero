import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RSS_URL = "https://georezo.net/extern.php?type=rss&fid=10";
const OUTPUT_FILE = path.join(__dirname, "../public/jobs.json");

// Job Type Detection Logic (Same as frontend to ensure consistency)
const detectType = (str) => {
  const s = str.toLowerCase();
  if (s.includes("stage")) return "Stage";
  if (s.includes("cdd")) return "CDD";
  if (s.includes("cdi")) return "CDI";
  if (
    s.includes("alternance") ||
    s.includes("apprentissage") ||
    s.includes("contrat pro")
  )
    return "Alternance";
  if (s.includes("thèse") || s.includes("these")) return "Thèse";
  if (s.includes("freelance") || s.includes("indépendant")) return "Freelance";
  if (s.includes("intérim") || s.includes("interim")) return "Intérim";
  return null;
};

const parseTitle = (rawTitle) => {
  let type = "Autre";

  // First try brackets
  const bracketMatch = rawTitle.match(/^\[(.*?)\]/);
  if (bracketMatch) {
    const bracketContent = bracketMatch[1];
    const detected = detectType(bracketContent);
    if (detected) type = detected;
    else {
      const titleDetected = detectType(rawTitle);
      if (titleDetected) type = titleDetected;
    }
  } else {
    const detected = detectType(rawTitle);
    if (detected) type = detected;
  }

  // Clean title
  let remainder = rawTitle.replace(/^\[(.*?)\]\s*/, "");
  let department = "";
  let city = "";

  // Extract Dept
  const deptMatch = remainder.match(/\((\d{2,3}|2A|2B)\)\s*$/);
  if (deptMatch) {
    department = deptMatch[1];
    remainder = remainder.replace(/\((\d{2,3}|2A|2B)\)\s*$/, "").trim();
  }

  // Extract City (Basic implementation specific for script)
  remainder = remainder.replace(/–|—/g, "-");
  const lastDashIndex = remainder.lastIndexOf(" - ");

  if (lastDashIndex > -1) {
    city = remainder.substring(lastDashIndex + 3).trim();
    remainder = remainder.substring(0, lastDashIndex).trim();
  } else if (department) {
    // Basic fallback similar to frontend, but kept simple for script
    const potentialCityMatch = remainder.match(
      /([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:[\s-][A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+)*)$/,
    );
    if (potentialCityMatch) {
      const potentialCity = potentialCityMatch[1];
      const commonJobWords = [
        "Projet",
        "Mission",
        "Etudes",
        "Travaux",
        "Developpement",
        "Service",
        "Donnees",
      ];
      if (!commonJobWords.includes(potentialCity)) {
        city = potentialCity;
        remainder = remainder
          .substring(0, remainder.length - city.length)
          .trim();
      }
    }
  }

  return { type, cleanTitle: remainder, city, department };
};

const fetchRSS = async () => {
  try {
    console.log(`Fetching RSS from ${RSS_URL}...`);
    const response = await fetch(RSS_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(text);

    const channelItems = result.rss.channel.item;
    const items = Array.isArray(channelItems) ? channelItems : [channelItems];

    console.log(`Parsing ${items.length} items...`);

    const jobs = items.map((item) => {
      const { title, link, description, pubDate, guid } = item;
      const { type, cleanTitle, city, department } = parseTitle(title);

      return {
        id: (guid && guid["#text"]) || link,
        title: cleanTitle,
        type,
        city: city || "",
        department: department || "",
        description: description || "",
        link,
        pubDate,
        company: item["dc:creator"] || "",
        coordinates: null, // Coordinates will be handled by frontend or we could handle here if we had the DB?
        // Frontend handles geocoding via local IndexedDB cache, which is better to keep there.
      };
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jobs, null, 2));
    console.log(`Successfully wrote ${jobs.length} jobs to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("Error fetching/parsing RSS:", error);
    process.exit(1);
  }
};

fetchRSS();
