import React, { useState, useEffect } from 'react';
import { Database, Server } from 'lucide-react';
import { getCentralServerHost, testServerConnection } from '../services/api';
import CentralServerModal from './CentralServerModal';

interface CentralServerBadgeProps {
  variant?: 'navbar' | 'compact' | 'login';
}

export const CentralServerBadge: React.FC<CentralServerBadgeProps> = ({ variant = 'navbar' }) => {
  const [host, setHost] = useState(getCentralServerHost());
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkConnection = async (hostToCheck?: string) => {
    try {
      const res = await testServerConnection(hostToCheck || host);
      setStatus(res.success ? 'connected' : 'disconnected');
    } catch {
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(() => {
      checkConnection();
    }, 20000); // Check every 20s
    return () => clearInterval(interval);
  }, [host]);

  const dotColor =
    status === 'connected' ? '#10B981' : status === 'checking' ? '#F59E0B' : '#EF4444';

  const badgeBg =
    status === 'connected' ? '#ECFDF5' : status === 'checking' ? '#FFFBEB' : '#FEF2F2';

  const badgeBorder =
    status === 'connected' ? '#A7F3D0' : status === 'checking' ? '#FDE68A' : '#FECACA';

  const textColor =
    status === 'connected' ? '#065F46' : status === 'checking' ? '#92400E' : '#991B1B';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        title="Central Hotel Database & Multi-Laptop Sync (Click to view or edit)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: variant === 'navbar' ? '5px 11px' : '4px 9px',
          borderRadius: '20px',
          backgroundColor: badgeBg,
          border: `1.2px solid ${badgeBorder}`,
          color: textColor,
          fontSize: variant === 'login' ? '0.78rem' : '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            boxShadow: status === 'connected' ? '0 0 0 2px rgba(16, 185, 129, 0.25)' : 'none',
            flexShrink: 0,
          }}
        />
        <Database size={13} style={{ flexShrink: 0, opacity: 0.85 }} />
        <span style={{ fontFamily: 'monospace', letterSpacing: '-0.2px' }}>
          {variant === 'compact' ? host : `Central DB: ${host}`}
        </span>
      </button>

      <CentralServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onHostChanged={(newHost) => {
          setHost(newHost);
          checkConnection(newHost);
        }}
      />
    </>
  );
};

export default CentralServerBadge;
