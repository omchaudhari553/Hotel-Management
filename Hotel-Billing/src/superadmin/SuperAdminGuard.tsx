import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  // Check auth token
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('superadmin_token') ||
    localStorage.getItem('ajalkar_token') ||
    sessionStorage.getItem('token');

  // Inspect all possible keys to find the active authenticated user
  const findUser = () => {
    for (const key of ['superadmin_user', 'ajalkar_user', 'user']) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && (parsed.role || parsed.username || parsed.email)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return null;
  };

  const user = findUser();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  try {
    const role = (user.role || '').toUpperCase();
    const roles: string[] = user.roles || [];

    const isSuperAdmin =
      user.isSuperAdmin === true ||
      role === 'SUPER_ADMIN' ||
      role === 'PLATFORM_ADMIN' ||
      role === 'PLATFORM_SUPPORT' ||
      role === 'PLATFORM_FINANCE' ||
      role === 'PLATFORM_ANALYST' ||
      roles.includes('ROLE_SUPER_ADMIN') ||
      roles.includes('ROLE_PLATFORM_ADMIN') ||
      (user.username && user.username.toLowerCase() === 'superadmin') ||
      (user.email && user.email.toLowerCase() === 'superadmin@platform.com') ||
      user.isOwner === true ||
      role === 'OWNER';

    if (!isSuperAdmin) {
      return <Navigate to="/hotel/dashboard" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
