import { useEffect, useState, useMemo } from "react";
import { parseRSS } from "./services/rssParser";
import {
  geocodeLocation,
  geocodeQuery,
  ensureDatabaseLoaded,
  resolveLocationLocal,
} from "./services/geocoding";
import type { JobOffer } from "./types/job";
import { Sidebar } from "./components/UI/Sidebar";
import { JobMap } from "./components/Map/JobMap";
import { JobDetailOverlay } from "./components/UI/JobDetailOverlay";
import { haversineDistance } from "./utils/distance";

// Material Symbol Icon (Rounded variant)
const Icon = ({
  name,
  filled = false,
  size = 24,
}: {
  name: string;
  filled?: boolean;
  size?: number;
}) => (
  <span
    className="material-symbols-rounded"
    style={{
      fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      fontSize: `${size}px`,
    }}
  >
    {name}
  </span>
);

// Navigation pages
type NavPage = "home" | "list" | "jobs" | "saved" | "settings" | "map";

const NAV_ITEMS: { id: NavPage; icon: string; label: string }[] = [
  { id: "home", icon: "home", label: "Accueil" },
  { id: "list", icon: "list_alt", label: "Liste" },
  { id: "jobs", icon: "work", label: "Emplois" },
  { id: "saved", icon: "bookmark", label: "Favoris" },
];

// Mobile-specific nav items (includes map)
const MOBILE_NAV_ITEMS: { id: NavPage; icon: string; label: string }[] = [
  { id: "home", icon: "home", label: "Accueil" },
  { id: "map", icon: "map", label: "Carte" },
  { id: "saved", icon: "bookmark", label: "Favoris" },
  { id: "settings", icon: "settings", label: "Paramètres" },
];

// Placeholder page component
const PlaceholderPage = ({ icon, title }: { icon: string; title: string }) => (
  <div className="placeholder-page">
    <div className="placeholder-content">
      <div className="placeholder-icon">
        <Icon name={icon} size={64} />
      </div>
      <h2>{title}</h2>
      <p>Cette fonctionnalité est en cours de développement.</p>
      <div className="placeholder-progress">
        <div className="progress-bar">
          <div className="progress-fill" />
        </div>
        <span>Bientôt disponible</span>
      </div>
    </div>
  </div>
);

const JOB_TYPES = ["Tous", "CDI", "CDD", "Stage", "Alternance", "Freelance"];

// Auto-refresh interval (5 minutes)
const RSS_REFRESH_INTERVAL = 5 * 60 * 1000;

function App() {
  const [allJobs, setAllJobs] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [activePage, setActivePage] = useState<NavPage>("home");

  // Filter States
  const [radius, setRadius] = useState(30); /* Default radius 30km */
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(
    null,
  );
  const [jobTypeFilter, setJobTypeFilter] = useState("Tous");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Mobile States
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Function to load jobs
  const loadJobs = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);

    try {
      // Start DB load in parallel with RSS fetch if not already loaded
      const dbPromise = ensureDatabaseLoaded();
      const parsedJobs = await parseRSS();

      // Wait for DB to be ready before geocoding
      await dbPromise;

      // 1. Initial Pass: Resolve what we can LOCALLY (Sync)
      // This is nearly instant and allows immediate rendering
      const { resolvedJobs, needsApi } = parsedJobs.reduce(
        (acc, job) => {
          if ((job.city || job.department) && !job.coordinates) {
             const localCoords = resolveLocationLocal(job.city, job.department);
             if (localCoords) {
                acc.resolvedJobs.push({ ...job, coordinates: localCoords });
             } else {
                // Keep distinct: needs API lookup
                acc.resolvedJobs.push(job);
                acc.needsApi.push(job);
             }
          } else {
            acc.resolvedJobs.push(job);
          }
          return acc;
        },
        { resolvedJobs: [] as JobOffer[], needsApi: [] as JobOffer[] }
      );

      // Render immediately with mostly-complete data
      setAllJobs(resolvedJobs);
      setLoading(false);

      // 2. Background Pass: API Lookup for missing ones
      // This runs silently in background
      if (needsApi.length > 0) {
         let updated = false;
         const finalJobs = [...resolvedJobs];
         
         const processQueue = async () => {
             for (const job of needsApi) {
                // Careful with rate limiting - handle one at a time or buffered
                const coords = await geocodeLocation(job.city, job.department);
                if (coords) {
                   // Update the specific job in our local list
                   const idx = finalJobs.findIndex(j => j.id === job.id);
                   if (idx !== -1) {
                       finalJobs[idx] = { ...finalJobs[idx], coordinates: coords };
                       updated = true;
                   }
                }
             }
             
             if (updated) {
                 setAllJobs([...finalJobs]);
             }
         };
         
         processQueue();
      }

    } catch (error) {
      console.error("Failed to load jobs:", error);
      setLoading(false);
    }
  };

  // Debounced Search Geocoding
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length > 2) {
        const coords = await geocodeQuery(searchTerm);
        if (coords) setSearchLocation(coords);
      } else {
        setSearchLocation(null);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial load and auto-refresh
  useEffect(() => {
    loadJobs();

    // Set up auto-refresh for RSS feed
    const refreshInterval = setInterval(() => {
      loadJobs(false);
    }, RSS_REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, []);

  const filteredJobs = useMemo(() => {
    let filtered = allJobs;

    if (radius > 0 && searchLocation) {
      filtered = filtered.filter((job) => {
        if (!job.coordinates) return false;
        const dist = haversineDistance(searchLocation, job.coordinates);
        return dist <= radius;
      });
    }

    if (jobTypeFilter !== "Tous") {
      filtered = filtered.filter((job) => job.type.includes(jobTypeFilter));
    }

    if (locationFilter) {
      filtered = filtered.filter(
        (job) =>
          job.city.toLowerCase().includes(locationFilter.toLowerCase()) ||
          job.department.includes(locationFilter),
      );
    }

    return filtered;
  }, [allJobs, radius, searchLocation, jobTypeFilter, locationFilter]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    allJobs.forEach((job) => {
      if (job.city) locations.add(job.city);
    });
    return Array.from(locations).sort().slice(0, 10);
  }, [allJobs]);

  const renderMainContent = () => {
    switch (activePage) {
      case "home":
        return (
          <>
            <Sidebar
              jobs={filteredJobs}
              selectedJobId={selectedJob?.id}
              onSelectJob={setSelectedJob}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onLocationSelect={(coords) => {
                setSearchLocation(coords);
                /* Ensure radius is active when explicit location picked */
                if (radius === 0) setRadius(30);
              }}
              className={showMobileMap ? "hidden-on-mobile" : ""}
            />

            <main
              className={`content-area ${showMobileMap ? "mobile-visible" : ""}`}
            >
              <div className="filter-bar">
                <div className="filter-dropdown-wrapper">
                  <button
                    className={`filter-pill ${jobTypeFilter !== "Tous" ? "active" : ""}`}
                    onClick={() => {
                      setShowTypeDropdown(!showTypeDropdown);
                      setShowLocationDropdown(false);
                    }}
                  >
                    Type : {jobTypeFilter}
                    <Icon name="expand_more" />
                  </button>

                  {showTypeDropdown && (
                    <div className="dropdown-menu">
                      {JOB_TYPES.map((type) => (
                        <button
                          key={type}
                          className={`dropdown-item ${jobTypeFilter === type ? "active" : ""}`}
                          onClick={() => {
                            setJobTypeFilter(type);
                            setShowTypeDropdown(false);
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="filter-dropdown-wrapper">
                  <button
                    className={`filter-pill ${locationFilter ? "active" : ""}`}
                    onClick={() => {
                      setShowLocationDropdown(!showLocationDropdown);
                      setShowTypeDropdown(false);
                    }}
                  >
                    Lieu : {locationFilter || "Tous"}
                    <Icon name="expand_more" />
                  </button>

                  {showLocationDropdown && (
                    <div className="dropdown-menu">
                      <button
                        className={`dropdown-item ${!locationFilter ? "active" : ""}`}
                        onClick={() => {
                          setLocationFilter("");
                          setShowLocationDropdown(false);
                        }}
                      >
                        Tous les lieux
                      </button>
                      {uniqueLocations.map((loc) => (
                        <button
                          key={loc}
                          className={`dropdown-item ${locationFilter === loc ? "active" : ""}`}
                          onClick={() => {
                            setLocationFilter(loc);
                            setShowLocationDropdown(false);
                          }}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="map-wrapper">
                {/* Key forces remount on mobile toggle to fix tile grey issues */}
                <JobMap
                  key={showMobileMap ? "mobile-map" : "desktop-map"}
                  jobs={filteredJobs}
                  selectedJob={selectedJob}
                  onSelectJob={setSelectedJob}
                  searchLocation={searchLocation}
                  radius={radius}
                />
              </div>

              {selectedJob && (
                <JobDetailOverlay
                  job={selectedJob}
                  onClose={() => setSelectedJob(null)}
                />
              )}
            </main>
          </>
        );

      case "list":
        return <PlaceholderPage icon="list_alt" title="Liste des offres" />;

      case "jobs":
        return <PlaceholderPage icon="work" title="Mes candidatures" />;

      case "saved":
        return <PlaceholderPage icon="bookmark" title="Offres sauvegardées" />;

      case "settings":
        return <PlaceholderPage icon="settings" title="Paramètres" />;

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-logo">G</div>

        {/* Expandable Search Bar */}
        <div
          className={`mobile-search-container ${showMobileSearch ? "expanded" : ""}`}
        >
          <input
            type="text"
            className="mobile-search-input"
            placeholder="Rechercher une ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`mobile-search-btn ${showMobileSearch ? "active" : ""}`}
            onClick={() => {
              setShowMobileSearch(!showMobileSearch);
              setShowMobileFilters(false);
            }}
          >
            <Icon name={showMobileSearch ? "close" : "search"} size={20} />
          </button>

          <button 
              className={`mobile-filter-btn ${showMobileFilters ? 'active' : ''}`} 
              onClick={() => {
                  setShowMobileFilters(!showMobileFilters);
                  setShowMobileSearch(false);
              }}
            >
              <Icon name={showMobileFilters ? "close" : "tune"} size={20} />
            </button>
        </div>
      </header>

      {/* Mobile Filter Overlay */}
      {showMobileFilters && (
        <div className="mobile-filter-overlay">
           {/* Drag Handle */}
           <div className="filter-handle-bar">
             <div className="filter-handle" />
           </div>

           {/* Job Type Section */}
           <div className="mobile-filter-section">
              <h3 className="mobile-filter-title">Type de contrat</h3>
              <div className="mobile-filter-chips">
                  <button
                    className={`mobile-chip ${jobTypeFilter === "Tous" ? 'active' : ''}`}
                    onClick={() => setJobTypeFilter("Tous")}
                  >
                    Tous
                  </button>
                  {JOB_TYPES.filter(t => t !== "Tous").map(type => (
                    <button
                      key={type}
                      className={`mobile-chip ${jobTypeFilter === type ? 'active' : ''}`}
                      onClick={() => setJobTypeFilter(type)}
                    >
                      {type}
                    </button>
                  ))}
              </div>
           </div>

           {/* Location Section */}
           <div className="mobile-filter-section">
              <h3 className="mobile-filter-title">Lieu</h3>
              <div className="mobile-filter-chips">
                  <button
                    className={`mobile-chip ${!locationFilter ? 'active' : ''}`}
                    onClick={() => setLocationFilter("")}
                  >
                    Partout
                  </button>
                  {uniqueLocations.map(loc => (
                    <button
                      key={loc}
                      className={`mobile-chip ${locationFilter === loc ? 'active' : ''}`}
                      onClick={() => setLocationFilter(loc)}
                    >
                      {loc}
                    </button>
                  ))}
              </div>
           </div>
        </div>
      )}

      {/* Desktop Nav Bar */}
      <nav className="nav-bar">
        <div className="nav-logo">G</div>
        <div className="nav-items">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => setActivePage(item.id)}
              title={item.label}
            >
              <Icon name={item.icon} filled={activePage === item.id} />
            </button>
          ))}
        </div>
        <div className="nav-bottom">
          <button
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
            onClick={() => setActivePage("settings")}
            title="Paramètres"
          >
            <Icon name="settings" filled={activePage === "settings"} />
          </button>
        </div>
      </nav>

      {renderMainContent()}

      {loading && activePage === "home" && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Chargement des offres...</p>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        {MOBILE_NAV_ITEMS.map((item) => {
          // Determine if this item is active - only ONE can be active
          const isActive =
            item.id === "map"
              ? showMobileMap
              : !showMobileMap && activePage === item.id;

          return (
            <button
              key={item.id}
              data-testid={`mobile-nav-${item.id}`}
              className={`mobile-nav-item ${isActive ? "active" : ""}`}
              onClick={() => {
                if (item.id === "map") {
                  // Always open map, never toggle off
                  setActivePage("home");
                  setShowMobileMap(true);
                } else if (item.id === "home") {
                  // Always open list (hide map), stay on home page
                  setActivePage("home");
                  setShowMobileMap(false);
                } else {
                  // Other pages (Saved, Settings)
                  setShowMobileMap(false);
                  setActivePage(item.id);
                }
              }}
            >
              <Icon name={item.icon} filled={isActive} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
