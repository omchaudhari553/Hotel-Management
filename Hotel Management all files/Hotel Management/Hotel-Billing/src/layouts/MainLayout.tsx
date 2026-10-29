import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { Sidebar } from '../common/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';

export const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { activeIndustryCode } = useIndustry();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const industry = (activeIndustryCode || 'HOTEL').toLowerCase();

  return (
    <div className="app-container" data-industry={industry}>
      <Sidebar />
      <main className="main-content">
        <Navbar />
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
