import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';

interface IndustryGuardProps {
  requiredIndustry: 'HOTEL' | 'MESS' | 'CAFE';
  children: React.ReactNode;
}

export const IndustryGuard: React.FC<IndustryGuardProps> = ({ requiredIndustry, children }) => {
  const { isAuthenticated, business } = useAuth();
  const { activeIndustryCode, setIndustryCode } = useIndustry();

  // 1. If user is not authenticated, redirect to Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Resolve authorized subscribed industry from user's business profile
  const authorizedIndustry = (business?.industryType?.toUpperCase() ||
    activeIndustryCode ||
    localStorage.getItem('ajalkar_industry') ||
    'HOTEL') as 'HOTEL' | 'MESS' | 'CAFE';

  // 3. Strict single-industry restriction: if requested route does not match authorized industry, block and redirect
  if (requiredIndustry !== authorizedIndustry) {
    const authorizedPath = `/${authorizedIndustry.toLowerCase()}/dashboard`;
    return <Navigate to={authorizedPath} replace />;
  }

  // 4. Ensure activeIndustryCode aligns with the authorized industry
  if (activeIndustryCode !== authorizedIndustry) {
    setIndustryCode(authorizedIndustry);
  }

  return <>{children}</>;
};

export const SharedModuleGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, business } = useAuth();
  const { activeIndustryCode, setIndustryCode } = useIndustry();

  // 1. If user is not authenticated, redirect to Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Ensure active industry is locked to business subscribed industry
  const authorizedIndustry = (business?.industryType?.toUpperCase() ||
    activeIndustryCode ||
    localStorage.getItem('ajalkar_industry') ||
    'HOTEL') as 'HOTEL' | 'MESS' | 'CAFE';

  if (activeIndustryCode !== authorizedIndustry) {
    setIndustryCode(authorizedIndustry);
  }

  return <>{children}</>;
};
