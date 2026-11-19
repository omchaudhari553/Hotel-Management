import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const OwnerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Branch users are strictly prohibited from accessing Owner Admin
  const isBranchUser = Boolean(user.branchId);
  const isOwner =
    user.role === 'OWNER' ||
    (user as any).isOwner === true ||
    (!isBranchUser && (user.roles?.includes('ROLE_OWNER') || user.roles?.includes('ROLE_ADMIN') || user.role === 'ADMIN'));

  if (isBranchUser || !isOwner) {
    // If user is a branch user, redirect to their Hotel Dashboard
    return <Navigate to="/hotel/dashboard" replace />;
  }

  return <>{children}</>;
};

export default OwnerGuard;

