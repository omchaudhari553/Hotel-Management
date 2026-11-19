import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * BranchesModule has been removed as per system requirements.
 * Redirects to the Hotel Dashboard.
 */
const BranchesModule: React.FC = () => {
  return <Navigate to="/hotel/dashboard" replace />;
};

export default BranchesModule;
