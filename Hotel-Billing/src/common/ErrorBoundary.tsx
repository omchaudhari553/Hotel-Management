import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    localStorage.removeItem('ajalkar_industry');
    window.location.href = '/get-started';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            padding: '24px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '36px 30px',
              boxShadow: '0 10px 25px -5px rgba(9, 0, 64, 0.08)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                border: '1px solid #FECACA',
              }}
            >
              <AlertCircle size={28} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#090040', marginBottom: '8px' }}>
              Application Display Notice
            </h2>

            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, marginBottom: '22px' }}>
              We encountered an issue rendering this workspace view. You can reload the application or return to the business selection gateway.
            </p>

            {this.state.error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.78rem',
                  color: '#475569',
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  marginBottom: '24px',
                  overflowX: 'auto',
                  maxHeight: '100px',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '11px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#090040',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(9, 0, 64, 0.35)',
                }}
              >
                <RefreshCw size={16} />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '11px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  color: '#090040',
                  border: '1px solid #E2E8F0',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Home size={16} />
                <span>Choose Business</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
