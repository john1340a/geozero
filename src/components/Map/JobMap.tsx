import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import type { JobOffer } from '../../types/job';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Custom Marker Icon - Graphite/Dark Grey gradient circles like the inspiration
const createCustomIcon = (type: string) => {
  // Default = Slate (Neutral Gray)
  let color = '#94a3b8'; // Slate 400
  let shadowColor = 'rgba(148, 163, 184, 0.3)';
  
  if (type.toLowerCase().includes("stage")) {
    color = '#5eead4'; // Teal 300 (Soft)
    shadowColor = 'rgba(94, 234, 212, 0.3)';
  } else if (type.toLowerCase().includes("cdd")) {
    color = '#fcd34d'; // Amber 300 (Soft)
    shadowColor = 'rgba(252, 211, 77, 0.3)';
  } else if (type.toLowerCase().includes("cdi")) {
    color = '#fda4af'; // Rose 300 (Soft)
    shadowColor = 'rgba(253, 164, 175, 0.3)';
  } else if (type.toLowerCase().includes("freelance") || type.toLowerCase().includes("alternance")) {
    color = '#c4b5fd'; // Violet 300 (Soft)
    shadowColor = 'rgba(196, 181, 253, 0.3)';
  } else if (type.toLowerCase().includes("intérim") || type.toLowerCase().includes("interim")) {
    color = '#fdba74'; // Orange 300
    shadowColor = 'rgba(253, 186, 116, 0.3)';
  }

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 10px;
        height: 10px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 0 5px ${shadowColor};
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>
    `,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -5]
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
        background: #52525b; /* Zinc 600 */
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

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

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

            </Marker>
          )
        ))}
      </MarkerClusterGroup>

      {selectedJob?.coordinates && <MapUpdater center={selectedJob.coordinates} zoom={12} />}
      {searchLocation && !selectedJob && <MapUpdater center={searchLocation} zoom={9} />}
      <MapResizer />
    </MapContainer>
    </>
  );
};
