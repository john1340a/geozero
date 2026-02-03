import { useMemo, useState, useEffect } from 'react';
import type { JobOffer } from "../../types/job";
import { searchCities, type CityResult, DEPARTMENTS, NAME_TO_CODE } from "../../services/geocoding";

// ... (props interface)

// ... (Icon component)

// ... (inside Sidebar component)



interface SidebarProps {
  jobs: JobOffer[];
  selectedJobId?: string;
  onSelectJob: (job: JobOffer) => void;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onLocationSelect?: (coords: [number, number]) => void;
  className?: string;
}

// Material Symbols Icon (Rounded variant)
const Icon = ({ name, filled = false, size = 22 }: { name: string; filled?: boolean; size?: number }) => (
  <span 
    className="material-symbols-rounded" 
    style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0", fontSize: `${size}px` }}
  >
    {name}
  </span>
);

export const Sidebar = ({ 
  jobs, 
  selectedJobId, 
  onSelectJob, 
  searchTerm, 
  onSearchChange,
  onLocationSelect,
  className
}: SidebarProps) => {
  const [citySuggestions, setCitySuggestions] = useState<CityResult[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced city search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setCitySuggestions([]);
      setShowCityDropdown(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchCities(searchTerm);
      setCitySuggestions(results);
      setShowCityDropdown(results.length > 0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredJobs = useMemo(() => {
    if (!searchTerm) return jobs;
    return jobs.filter(j => 
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        j.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.department.includes(searchTerm)
    );
  }, [jobs, searchTerm]);

  const getJobTypeIcon = (type: string) => {
    if (type.includes("Stage")) return { icon: "school", color: "#5eead4" }; // Teal 300
    if (type.includes("CDD")) return { icon: "schedule", color: "#fcd34d" }; // Amber 300
    if (type.includes("CDI")) return { icon: "work", color: "#fda4af" }; // Rose 300
    if (type.includes("Alternance")) return { icon: "pending_actions", color: "#c4b5fd" }; // Violet 300
    return { icon: "work_outline", color: "#94a3b8" }; // Slate 400
  };

  const handleCitySelect = (city: CityResult) => {
    onSearchChange(city.name);
    setShowCityDropdown(false);
  };

  const formatLocation = (city: string, dept: string) => {
    // If we have both, perfect
    if (city && dept) return `${city} (${dept})`;
    
    // If only city (might be a region/department name like "Guyane")
    if (city && !dept) {
        // Try to find if the city is actually a department name
        const inferredCode = NAME_TO_CODE[city.toLowerCase()];
        if (inferredCode) return `${city} (${inferredCode})`;
        return city;
    }

    // If only department code
    if (dept) {
        const deptName = DEPARTMENTS[dept.padStart(2, '0')];
        return deptName ? `${deptName} (${dept})` : `Département ${dept}`;
    }
    
    return "";
  };

  return (
    <aside className={`job-panel ${className || ''}`}>
      {/* Header - Now floating glass panel matching Filter Bar */}
      <div 
        className="panel-header glass-panel" 
        style={{
          marginBottom: '8px', // Reduced to match card spacing
          borderRadius: '24px',
          padding: '16px 24px', // Match Filter Bar padding
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Search with Dropdown - No Title, No Counter */}
        <div className="search-wrapper" style={{width: '100%'}}>
          <Icon name="search" size={20} />
          <input
            type="text"
            placeholder="Rechercher par ville, poste..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => citySuggestions.length > 0 && setShowCityDropdown(true)}
            className="search-input"
            style={{padding: '12px 40px 12px 42px'}} /* Balanced padding: Left for icon, Right for spinner */
          />
          {isSearching && (
            <span className="search-loading material-symbols-rounded">progress_activity</span>
          )}
          
          {/* City Suggestions Dropdown */}
          {showCityDropdown && (
            <div className="search-dropdown">
              {citySuggestions.map((city, index) => (
                <button
                  key={index}
                  className="dropdown-item"
                  onClick={() => {
                    handleCitySelect(city);
                    // Pass coordinates directly if available
                    if (onLocationSelect && city.coordinates) {
                      onLocationSelect(city.coordinates);
                    }
                  }}
                >
                  <span>{city.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Job List - Transparent background */}
      <div className="job-list custom-scroll" style={{padding: '0 4px'}}>
        {filteredJobs.map(job => {
          const typeInfo = getJobTypeIcon(job.type);
          const location = formatLocation(job.city, job.department);
          
          return (
            <div 
              key={job.id} 
              className={`job-card ${job.id === selectedJobId ? 'selected' : ''}`}
              onClick={() => onSelectJob(job)}
            >
              <div className="job-card-header">
                <div 
                  className="job-icon"
                  style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}
                >
                  <Icon name={typeInfo.icon} filled />
                </div>
                <div className="job-info">
                  <h3 className="job-title">{job.title}</h3>
                  <p className="job-location">
                    {location ? `${location}, France` : "France"}
                  </p>
                </div>
              </div>
              
              <div 
                className="job-description" 
                dangerouslySetInnerHTML={{ __html: job.description }} 
              />
              
              <div className="job-card-footer">
                <a 
                  href={job.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-apply btn-shine"
                  onClick={(e) => e.stopPropagation()}
                >
                  Postuler
                </a>
              </div>
            </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="empty-state">
            <Icon name="search_off" size={48} />
            <p>Aucune offre trouvée.</p>
          </div>
        )}
      </div>
    </aside>
  );
};
