import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { Sidebar } from '../common/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';

export const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { activeIndustryCode } = useIndustry();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Automatically close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const industry = (activeIndustryCode || 'HOTEL').toLowerCase();

  return (
    <div className={`app-container ${mobileMenuOpen ? 'mobile-menu-active' : ''}`} data-industry={industry}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <Navbar onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
