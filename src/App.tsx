import { useEffect, useState, useMemo } from 'react';
import { parseRSS } from './services/rssParser';
import { geocodeLocation, geocodeQuery, ensureDatabaseLoaded } from './services/geocoding';
import type { JobOffer } from './types/job';
import { Sidebar } from './components/UI/Sidebar';
import { JobMap } from './components/Map/JobMap';
import { JobDetailOverlay } from './components/UI/JobDetailOverlay';
import { haversineDistance } from './utils/distance';

// Material Symbol Icon (Rounded variant)
const Icon = ({ name, filled = false, size = 24 }: { name: string; filled?: boolean; size?: number }) => (
  <span 
    className="material-symbols-rounded" 
    style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0", fontSize: `${size}px` }}
  >
    {name}
  </span>
);

// Navigation pages
type NavPage = 'home' | 'list' | 'jobs' | 'saved' | 'settings';

const NAV_ITEMS: { id: NavPage; icon: string; label: string }[] = [
  { id: 'home', icon: 'home', label: 'Accueil' },
  { id: 'list', icon: 'list_alt', label: 'Liste' },
  { id: 'jobs', icon: 'work', label: 'Emplois' },
  { id: 'saved', icon: 'bookmark', label: 'Favoris' },
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
  const [activePage, setActivePage] = useState<NavPage>('home');
  
  // Filter States
  const [radius] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [jobTypeFilter, setJobTypeFilter] = useState("Tous");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Function to load jobs
  const loadJobs = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    
    try {
      // Start DB load in parallel with RSS fetch if not already loaded
      const dbPromise = ensureDatabaseLoaded();
      const parsedJobs = await parseRSS();
      
      // Wait for DB to be ready before geocoding
      await dbPromise;
      
      const geocodedJobs: JobOffer[] = [];
      for (const job of parsedJobs) {
        if ((job.city || job.department) && !job.coordinates) {
          const coords = await geocodeLocation(job.city, job.department);
          if (coords) {
            geocodedJobs.push({ ...job, coordinates: coords });
          } else {
            geocodedJobs.push(job);
          }
        } else {
          geocodedJobs.push(job);
        }
      }
      
      setAllJobs(geocodedJobs);
    } catch (error) {
      console.error("Failed to load jobs:", error);
    }
    
    setLoading(false);
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
          filtered = filtered.filter(job => {
              if (!job.coordinates) return false;
              const dist = haversineDistance(searchLocation, job.coordinates);
              return dist <= radius;
          });
      }

      if (jobTypeFilter !== "Tous") {
        filtered = filtered.filter(job => job.type.includes(jobTypeFilter));
      }

      if (locationFilter) {
        filtered = filtered.filter(job => 
          job.city.toLowerCase().includes(locationFilter.toLowerCase()) ||
          job.department.includes(locationFilter)
        );
      }
      
      return filtered;
  }, [allJobs, radius, searchLocation, jobTypeFilter, locationFilter]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    allJobs.forEach(job => {
      if (job.city) locations.add(job.city);
    });
    return Array.from(locations).sort().slice(0, 10);
  }, [allJobs]);

  const renderMainContent = () => {
    switch (activePage) {
      case 'home':
        return (
          <>
            <Sidebar 
              jobs={filteredJobs} 
              selectedJobId={selectedJob?.id} 
              onSelectJob={setSelectedJob}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />

            <main className="content-area">
              <div className="filter-bar">
                <div className="filter-dropdown-wrapper">
                  <button 
                    className={`filter-pill ${jobTypeFilter !== "Tous" ? 'active' : ''}`}
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
                      {JOB_TYPES.map(type => (
                        <button
                          key={type}
                          className={`dropdown-item ${jobTypeFilter === type ? 'active' : ''}`}
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
                    className={`filter-pill ${locationFilter ? 'active' : ''}`}
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
                        className={`dropdown-item ${!locationFilter ? 'active' : ''}`}
                        onClick={() => {
                          setLocationFilter("");
                          setShowLocationDropdown(false);
                        }}
                      >
                        Tous les lieux
                      </button>
                      {uniqueLocations.map(loc => (
                        <button
                          key={loc}
                          className={`dropdown-item ${locationFilter === loc ? 'active' : ''}`}
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
                  <JobMap 
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
      
      case 'list':
        return <PlaceholderPage icon="list_alt" title="Liste des offres" />;
      
      case 'jobs':
        return <PlaceholderPage icon="work" title="Mes candidatures" />;
      
      case 'saved':
        return <PlaceholderPage icon="bookmark" title="Offres sauvegardées" />;
      
      case 'settings':
        return <PlaceholderPage icon="settings" title="Paramètres" />;
      
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <div className="nav-logo">G</div>
        <div className="nav-items">
          {NAV_ITEMS.map(item => (
            <button 
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={item.label}
            >
              <Icon name={item.icon} filled={activePage === item.id} />
            </button>
          ))}
        </div>
        <div className="nav-bottom">
          <button 
            className={`nav-item ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => setActivePage('settings')}
            title="Paramètres"
          >
            <Icon name="settings" filled={activePage === 'settings'} />
          </button>
        </div>
      </nav>

      {renderMainContent()}

      {loading && activePage === 'home' && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Chargement des offres...</p>
        </div>
      )}
    </div>
  );
}

export default App;
