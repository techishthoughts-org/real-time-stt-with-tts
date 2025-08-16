import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { Error, Refresh } from '@mui/icons-material';
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo,
        });
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by boundary:', error, errorInfo);
        }
        // In production, you would send this to an error reporting service
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }
    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };
    handleReload = () => {
        window.location.reload();
    };
    render() {
        if (this.state.hasError) {
            return (_jsx(Box, { sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    backgroundColor: 'background.default',
                    p: 3,
                }, children: _jsxs(Paper, { elevation: 3, sx: {
                        p: 4,
                        borderRadius: 3,
                        textAlign: 'center',
                        maxWidth: 600,
                        width: '100%',
                    }, children: [_jsx(Error, { sx: { fontSize: 64, color: 'error.main', mb: 2 } }), _jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "Oops! Something went wrong" }), _jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mb: 3 }, children: "We're sorry, but something unexpected happened. Our team has been notified." }), _jsxs(Alert, { severity: "error", sx: { mb: 3, textAlign: 'left' }, children: [_jsxs(Typography, { variant: "body2", component: "div", children: [_jsx("strong", { children: "Error:" }), " ", this.state.error?.message || 'Unknown error'] }), process.env.NODE_ENV === 'development' && this.state.errorInfo && (_jsxs(Typography, { variant: "caption", component: "div", sx: { mt: 1 }, children: [_jsx("strong", { children: "Stack:" }), " ", this.state.errorInfo.componentStack] }))] }), _jsxs(Box, { sx: { display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }, children: [_jsx(Button, { variant: "contained", startIcon: _jsx(Refresh, {}), onClick: this.handleRetry, sx: { minWidth: 120 }, children: "Try Again" }), _jsx(Button, { variant: "outlined", onClick: this.handleReload, sx: { minWidth: 120 }, children: "Reload Page" })] }), _jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 3, display: 'block' }, children: "If the problem persists, please contact support" })] }) }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
