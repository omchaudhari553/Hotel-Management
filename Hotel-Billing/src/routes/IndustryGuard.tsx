import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';

interface IndustryGuardProps {
  requiredIndustry: 'HOTEL' | 'MESS' | 'CAFE';
  children: React.ReactNode;
}

export const IndustryGuard: React.FC<IndustryGuardProps> = ({ requiredIndustry, children }) => {
  const { isAuthenticated, business, user } = useAuth();
  const { activeIndustryCode, setIndustryCode } = useIndustry();

  // Resolve authorized subscribed industry from user's business profile
  const authorizedIndustry = (business?.industryType?.toUpperCase() ||
    activeIndustryCode ||
    localStorage.getItem('ajalkar_industry') ||
    'HOTEL') as 'HOTEL' | 'MESS' | 'CAFE';

  // Ensure activeIndustryCode aligns with the authorized industry asynchronously to avoid setState during render
  useEffect(() => {
    if (isAuthenticated && activeIndustryCode !== authorizedIndustry) {
      const timer = setTimeout(() => {
        setIndustryCode(authorizedIndustry);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, activeIndustryCode, authorizedIndustry, setIndustryCode]);

  // 1. If user is not authenticated, redirect to Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Strict Super Admin Redirection: Super Admin must view only Super Admin panel
  const isSuperAdmin = (() => {
    try {
      const raw = localStorage.getItem('superadmin_user') || localStorage.getItem('ajalkar_user') || localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        if (
          u?.role === 'SUPER_ADMIN' ||
          u?.role === 'PLATFORM_ADMIN' ||
          (u as any)?.isSuperAdmin ||
          u?.roles?.includes('ROLE_SUPER_ADMIN') ||
          u?.username?.toLowerCase() === 'superadmin'
        ) {
          return true;
        }
      }
    } catch {}
    return Boolean(
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'PLATFORM_ADMIN' ||
      (user as any)?.isSuperAdmin ||
      user?.roles?.includes('ROLE_SUPER_ADMIN') ||
      user?.username?.toLowerCase() === 'superadmin'
    );
  })();

  if (isSuperAdmin && sessionStorage.getItem('superadmin_viewing_hotel') !== 'true') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  // 3. Strict single-industry restriction: if requested route does not match authorized industry, block and redirect
  if (requiredIndustry !== authorizedIndustry) {
    const authorizedPath = `/${authorizedIndustry.toLowerCase()}/dashboard`;
    return <Navigate to={authorizedPath} replace />;
  }

  return <>{children}</>;
};

export const SharedModuleGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, business, user } = useAuth();
  const { activeIndustryCode, setIndustryCode } = useIndustry();

  // Resolve authorized subscribed industry from user's business profile
  const authorizedIndustry = (business?.industryType?.toUpperCase() ||
    activeIndustryCode ||
    localStorage.getItem('ajalkar_industry') ||
    'HOTEL') as 'HOTEL' | 'MESS' | 'CAFE';

  // Ensure active industry is locked to business subscribed industry asynchronously
  useEffect(() => {
    if (isAuthenticated && activeIndustryCode !== authorizedIndustry) {
      const timer = setTimeout(() => {
        setIndustryCode(authorizedIndustry);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, activeIndustryCode, authorizedIndustry, setIndustryCode]);

  // 1. If user is not authenticated, redirect to Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Strict Super Admin Redirection
  const isSuperAdmin = (() => {
    try {
      const raw = localStorage.getItem('superadmin_user') || localStorage.getItem('ajalkar_user') || localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        if (
          u?.role === 'SUPER_ADMIN' ||
          u?.role === 'PLATFORM_ADMIN' ||
          (u as any)?.isSuperAdmin ||
          u?.roles?.includes('ROLE_SUPER_ADMIN') ||
          u?.username?.toLowerCase() === 'superadmin'
        ) {
          return true;
        }
      }
    } catch {}
    return Boolean(
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'PLATFORM_ADMIN' ||
      (user as any)?.isSuperAdmin ||
      user?.roles?.includes('ROLE_SUPER_ADMIN') ||
      user?.username?.toLowerCase() === 'superadmin'
    );
  })();

  if (isSuperAdmin && sessionStorage.getItem('superadmin_viewing_hotel') !== 'true') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  return <>{children}</>;
};
