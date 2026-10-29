import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { IndustryProvider } from './context/IndustryContext';
import { ToastProvider } from './context/ToastContext';
import { BranchProvider } from './context/BranchContext';
import { LanguageProvider } from './context/LanguageContext';
import { DialogProvider } from './context/DialogContext';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorBoundary } from './common/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <DialogProvider>
            <ToastProvider>
              <AuthProvider>
                <IndustryProvider>
                  <BranchProvider>
                    <AppRoutes />
                  </BranchProvider>
                </IndustryProvider>
              </AuthProvider>
            </ToastProvider>
          </DialogProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
