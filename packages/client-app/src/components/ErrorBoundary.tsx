import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry or similar
      console.error('Would send to error tracking:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: '20px',
              margin: '20px',
              border: '2px solid #ff4444',
              borderRadius: '8px',
              backgroundColor: '#ffeeee',
              color: '#333',
            }}
          >
            <h2 style={{ color: '#ff4444', marginTop: 0 }}>
              Something went wrong
            </h2>
            <p>
              We're sorry, but something unexpected happened. Please try
              refreshing the page.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer' }}>
                  Error details (dev only)
                </summary>
                <pre
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '12px',
                  }}
                >
                  {this.state.error?.stack || this.state.error?.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
