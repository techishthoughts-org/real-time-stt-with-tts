import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Paper, Typography, Button, Box, IconButton, Chip, } from '@mui/material';
import { GetApp, Close, PhoneAndroid, Computer, } from '@mui/icons-material';
const PWAInstallPrompt = ({ onInstall, onDismiss, }) => {
    return (_jsx(Paper, { elevation: 8, sx: {
            position: 'fixed',
            bottom: 16,
            left: 16,
            right: 16,
            maxWidth: 400,
            mx: 'auto',
            p: 3,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            zIndex: 1000,
        }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'flex-start', gap: 2 }, children: [_jsxs(Box, { sx: { flex: 1 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 1 }, children: [_jsx(GetApp, { sx: { fontSize: 20 } }), _jsx(Typography, { variant: "h6", component: "h3", sx: { fontWeight: 600 }, children: "Install Gon Voice Assistant" })] }), _jsx(Typography, { variant: "body2", sx: { mb: 2, opacity: 0.9 }, children: "Get the full app experience with offline access and faster loading" }), _jsxs(Box, { sx: { display: 'flex', gap: 1, mb: 2 }, children: [_jsx(Chip, { icon: _jsx(PhoneAndroid, {}), label: "Mobile App", size: "small", sx: { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } }), _jsx(Chip, { icon: _jsx(Computer, {}), label: "Desktop App", size: "small", sx: { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { variant: "contained", onClick: onInstall, startIcon: _jsx(GetApp, {}), sx: {
                                        backgroundColor: 'white',
                                        color: 'primary.main',
                                        '&:hover': {
                                            backgroundColor: 'grey.100',
                                        },
                                        textTransform: 'none',
                                        fontWeight: 600,
                                    }, children: "Install App" }), onDismiss && (_jsx(Button, { variant: "text", onClick: onDismiss, sx: {
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                        },
                                        textTransform: 'none',
                                    }, children: "Maybe Later" }))] })] }), onDismiss && (_jsx(IconButton, { onClick: onDismiss, sx: {
                        color: 'white',
                        '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                    }, children: _jsx(Close, {}) }))] }) }));
};
export default PWAInstallPrompt;
