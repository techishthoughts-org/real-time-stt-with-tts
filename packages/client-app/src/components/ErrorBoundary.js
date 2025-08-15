import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
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
            return (this.props.fallback || (_jsxs("div", { style: {
                    padding: '20px',
                    margin: '20px',
                    border: '2px solid #ff4444',
                    borderRadius: '8px',
                    backgroundColor: '#ffeeee',
                    color: '#333',
                }, children: [_jsx("h2", { style: { color: '#ff4444', marginTop: 0 }, children: "Something went wrong" }), _jsx("p", { children: "We're sorry, but something unexpected happened. Please try refreshing the page." }), process.env.NODE_ENV === 'development' && (_jsxs("details", { style: { marginTop: '10px' }, children: [_jsx("summary", { style: { cursor: 'pointer' }, children: "Error details (dev only)" }), _jsx("pre", { style: {
                                    marginTop: '10px',
                                    padding: '10px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '4px',
                                    overflow: 'auto',
                                    fontSize: '12px',
                                }, children: this.state.error?.stack || this.state.error?.message })] })), _jsx("button", { onClick: () => window.location.reload(), style: {
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }, children: "Refresh Page" })] })));
        }
        return this.props.children;
    }
}
