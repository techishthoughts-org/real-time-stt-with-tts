import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
const LoadingScreen = () => {
    return (_jsx(Box, { sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'background.default',
        }, children: _jsxs(Paper, { elevation: 3, sx: {
                p: 4,
                borderRadius: 3,
                textAlign: 'center',
                maxWidth: 400,
                width: '100%',
            }, children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "\uD83C\uDFAD Gon Voice Assistant" }), _jsx(CircularProgress, { size: 60, sx: { my: 3 } }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "Loading your personal AI companion..." }), _jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 2, display: 'block' }, children: "Initializing voice recognition and AI services" })] }) }));
};
export default LoadingScreen;
