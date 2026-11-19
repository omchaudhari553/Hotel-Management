import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendPositive?: boolean;
  accentColor?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendPositive = true,
  accentColor = '#090040',
  icon,
}) => {
  return (
    <div
      className="card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '20px 22px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px 0 rgba(9, 0, 64, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(9, 0, 64, 0.08)';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(9, 0, 64, 0.04)';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}
    >
      {/* Top Subtle Accent Strip */}
      {accentColor && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3.5px',
            backgroundColor: accentColor,
          }}
        />
      )}

      {/* Header Row: Title & Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {title}
        </span>

        {icon && (
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ marginBottom: '6px' }}>
        <h3
          style={{
            fontSize: '1.9rem',
            fontWeight: 800,
            color: '#090040',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {value}
        </h3>
      </div>

      {/* Subtitle & Trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
        {subtitle && (
          <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
            {subtitle}
          </span>
        )}

        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.74rem',
              fontWeight: 700,
              backgroundColor: trendPositive ? '#ECFDF5' : '#FEF2F2',
              color: trendPositive ? '#10B981' : '#DC2626',
            }}
          >
            <span>{trendPositive ? '↑' : '↓'}</span>
            <span>{trend}</span>
          </span>
        )}
      </div>
    </div>
  );
};
