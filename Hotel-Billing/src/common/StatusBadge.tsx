import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status ? status.toUpperCase() : 'UNKNOWN';

  let badgeClass = 'badge-info';
  let label = status;

  switch (s) {
    case 'AVAILABLE':
    case 'PAID':
    case 'ACTIVE':
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PRESENT':
      badgeClass = 'badge-success';
      break;

    case 'OCCUPIED':
    case 'CHECKED_IN':
    case 'PENDING':
    case 'PREPARING':
    case 'DISPATCHED':
    case 'ORDERED':
      badgeClass = 'badge-warning';
      break;

    case 'CLEANING':
    case 'BILLED':
    case 'RESERVED':
    case 'PACKED_TIFFIN':
      badgeClass = 'badge-hotel';
      break;

    case 'MAINTENANCE':
    case 'CANCELLED':
    case 'EXPIRED':
    case 'FAILED':
    case 'OVERDUE':
    case 'ABSENT':
      badgeClass = 'badge-danger';
      break;

    default:
      badgeClass = 'badge-info';
  }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
};
