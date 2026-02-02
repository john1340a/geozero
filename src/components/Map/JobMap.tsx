import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import type { JobOffer } from '../../types/job';

// Custom Marker Icon - Graphite/Dark Grey gradient circles like the inspiration
const createCustomIcon = (type: string) => {
  // Default / Stage = Graphite (Modern Dark)
  let gradient = 'linear-gradient(135deg, #52525b, #27272a)'; // Zinc 600 -> Zinc 800
  let shadow = 'rgba(39, 39, 42, 0.4)';
  
  if (type.toLowerCase().includes("stage")) {
    gradient = 'linear-gradient(135deg, #52525b, #27272a)';
    shadow = 'rgba(39, 39, 42, 0.4)';
  } else if (type.toLowerCase().includes("cdd")) {
    gradient = 'linear-gradient(135deg, #fde68a, #f59e0b)';
    shadow = 'rgba(245, 158, 11, 0.4)';
  } else if (type.toLowerCase().includes("cdi")) {
    gradient = 'linear-gradient(135deg, #fca5a5, #ef4444)';
    shadow = 'rgba(239, 68, 68, 0.4)';
  }

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${gradient};
        border: 3px solid white;
        box-shadow: 0 4px 12px ${shadow};
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

interface JobMapProps {
  jobs: JobOffer[];
  selectedJob?: JobOffer | null;
  searchLocation?: [number, number] | null;
  radius?: number;
  onSelectJob: (job: JobOffer) => void;
}

const MapUpdater = ({ center, zoom }: { center: [number, number], zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
};

export const JobMap = ({ jobs, selectedJob, onSelectJob, searchLocation, radius }: JobMapProps) => {
  const defaultCenter: [number, number] = [46.603354, 1.888334];

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={6} 
      scrollWheelZoom={true} 
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      
      {/* Search Radius Circle - Gradient fill like inspiration */}
      {searchLocation && radius && radius > 0 && (
        <Circle 
          center={searchLocation} 
          radius={radius * 1000}
          pathOptions={{ 
            fillColor: '#27272a', 
            fillOpacity: 0.15, 
            color: '#27272a', 
            weight: 2,
            opacity: 0.6
          }}
        />
      )}

      {jobs.map((job) => (
        job.coordinates && (
          <Marker 
            key={job.id} 
            position={job.coordinates}
            icon={createCustomIcon(job.type)}
            eventHandlers={{
              click: () => onSelectJob(job),
            }}
          >
            <Popup>
              <div style={{ padding: '8px 4px', minWidth: '180px' }}>
                <h4 style={{ 
                  margin: '0 0 6px 0', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {job.title}
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: '#22c55e',
                  fontWeight: '500'
                }}>
                  📍 {job.city} ({job.department})
                </p>
              </div>
            </Popup>
          </Marker>
        )
      ))}

      {selectedJob?.coordinates && <MapUpdater center={selectedJob.coordinates} zoom={12} />}
      {searchLocation && !selectedJob && <MapUpdater center={searchLocation} zoom={9} />}
    </MapContainer>
  );
};
