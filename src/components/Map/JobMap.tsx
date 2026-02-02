import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import type { JobOffer } from '../../types/job';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Custom Marker Icon - Graphite/Dark Grey gradient circles like the inspiration
const createCustomIcon = (type: string) => {
  // Default / Stage = Graphite (Modern Dark)
  let color = '#52525b'; // Zinc 600
  let shadowColor = 'rgba(82, 82, 91, 0.3)'; // Lighter, transparent
  
  if (type.toLowerCase().includes("stage")) {
    color = '#22c55e'; 
    shadowColor = 'rgba(34, 197, 94, 0.3)';
  } else if (type.toLowerCase().includes("cdd")) {
    color = '#f59e0b';
    shadowColor = 'rgba(245, 158, 11, 0.3)';
  } else if (type.toLowerCase().includes("cdi")) {
    color = '#ef4444';
    shadowColor = 'rgba(239, 68, 68, 0.3)';
  } else if (type.toLowerCase().includes("freelance")) {
    color = '#8b5cf6';
    shadowColor = 'rgba(139, 92, 246, 0.3)';
  }

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 0 5px ${shadowColor};
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7]
  });
};

// Custom Cluster Icon - Graphite/Glass Theme
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let dims = 40;
  
  if (count > 10) { dims = 48; }
  if (count > 50) { dims = 56; }

  return L.divIcon({
    html: `
      <div style="
        width: ${dims}px;
        height: ${dims}px;
        background: #000000; /* Simple Black */
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Urbanist', sans-serif;
        font-weight: 300; /* Thin/Light font like logo */
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      ">
        ${count}
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: [dims, dims],
    iconAnchor: [dims/2, dims/2]
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
    <>
      {/* Search Radius Circle - Green Gradient fading to transparent */}
      <svg style={{ height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}>
        <defs>
        <defs>
          <linearGradient id="searchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        </defs>
      </svg>
      
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
      
      {/* Gradient definition moved up */}
      
      {searchLocation && radius && radius > 0 && (
        <Circle 
          center={searchLocation} 
          radius={radius * 1000}
          pathOptions={{ 
            fillColor: 'url(#searchGradient)', 
            fillOpacity: 1, /* Opacity handled in gradient */
            color: '#22c55e', /* Thin green border */
            weight: 1,
            opacity: 0.8
          }}
        />
      )}

      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        maxClusterRadius={60}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
      >
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
      </MarkerClusterGroup>

      {selectedJob?.coordinates && <MapUpdater center={selectedJob.coordinates} zoom={12} />}
      {searchLocation && !selectedJob && <MapUpdater center={searchLocation} zoom={9} />}
    </MapContainer>
    </>
  );
};
