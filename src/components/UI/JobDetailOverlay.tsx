import type { JobOffer } from "../../types/job";
import { DEPARTMENTS, NAME_TO_CODE } from "../../services/geocoding";

interface JobDetailOverlayProps {
  job: JobOffer;
  onClose: () => void;
}

export const JobDetailOverlay = ({ job, onClose }: JobDetailOverlayProps) => {
  const getJobTypeColor = (type: string) => {
    if (type.includes("Stage")) return { bg: '#dcfce7', text: '#16a34a' };
    if (type.includes("CDD")) return { bg: '#fef3c7', text: '#d97706' };
    if (type.includes("CDI")) return { bg: '#fee2e2', text: '#dc2626' };
    return { bg: '#f3f4f6', text: '#6b7280' };
  };

  const typeColors = getJobTypeColor(job.type);

  const formatLocation = (city: string, dept: string) => {
    if (city && dept) return `${city} (${dept})`;
    if (city && !dept) {
        const inferredCode = NAME_TO_CODE[city.toLowerCase()];
        if (inferredCode) return `${city} (${inferredCode})`;
        return city;
    }
    if (dept) {
        const deptName = DEPARTMENTS[dept.padStart(2, '0')];
        return deptName ? `${deptName} (${dept})` : `Département ${dept}`;
    }
    return "France";
  };

  const location = formatLocation(job.city, job.department);

  return (
    <div 
      className="job-detail-overlay glass-panel"
    >
      {/* Header */}
      <div style={{ 
        padding: '24px', 
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: '#f3f4f6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#6b7280'
          }}
        >
          ✕
        </button>

        {/* Type Badge */}
        <span style={{
          display: 'inline-block',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          background: typeColors.bg,
          color: typeColors.text,
          marginBottom: '16px'
        }}>
          {job.type}
        </span>

        {/* Title */}
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '700', 
          color: '#1f2937',
          margin: '0 0 8px 0',
          lineHeight: '1.3'
        }}>
          {job.title}
        </h2>

        {/* Location & Company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ 
            fontSize: '14px', 
            color: '#22c55e',
            fontWeight: '600'
          }}>
            {job.company || "GeoRezo"}
          </span>
          <span style={{ color: '#d1d5db' }}>•</span>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            📍 {location}
          </span>
        </div>

        {/* Date */}
        <p style={{ 
          fontSize: '13px', 
          color: '#9ca3af',
          marginTop: '12px',
          marginBottom: 0
        }}>
          Publié le : {job.pubDate}
        </p>
      </div>

      {/* Body */}
      <div 
        className="custom-scroll"
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '24px' 
        }}
      >
        <div 
          style={{ 
            fontSize: '14px', 
            color: '#4b5563', 
            lineHeight: '1.7' 
          }}
          dangerouslySetInnerHTML={{ __html: job.description }}
        />
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '20px 24px', 
        borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: 'white',
            fontSize: '14px',
            fontWeight: '600',
            color: '#6b7280',
            cursor: 'pointer'
          }}
          className="btn-shine"
        >
          Fermer
        </button>
        <a
          href={job.link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-apply btn-shine"
          style={{
            padding: '12px 28px',
            borderRadius: '12px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Postuler →
        </a>
      </div>
    </div>
  );
};
