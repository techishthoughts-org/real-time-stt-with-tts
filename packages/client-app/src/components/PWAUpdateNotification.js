import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Paper, Typography, Button, Box, IconButton, Alert, } from '@mui/material';
import { Update, Close, Refresh, } from '@mui/icons-material';
const PWAUpdateNotification = ({ onUpdate, onDismiss, }) => {
    return (_jsx(Paper, { elevation: 8, sx: {
            position: 'fixed',
            top: 16,
            left: 16,
            right: 16,
            maxWidth: 500,
            mx: 'auto',
            p: 3,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
            color: 'white',
            zIndex: 1000,
        }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'flex-start', gap: 2 }, children: [_jsxs(Box, { sx: { flex: 1 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 1 }, children: [_jsx(Update, { sx: { fontSize: 20 } }), _jsx(Typography, { variant: "h6", component: "h3", sx: { fontWeight: 600 }, children: "New Version Available" })] }), _jsx(Typography, { variant: "body2", sx: { mb: 2, opacity: 0.9 }, children: "A new version of Gon Voice Assistant is available with improved features and performance" }), _jsx(Alert, { severity: "info", sx: {
                                mb: 2,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                '& .MuiAlert-icon': { color: 'white' },
                            }, children: _jsx(Typography, { variant: "body2", children: "Update now to get the latest features and security improvements" }) }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { variant: "contained", onClick: onUpdate, startIcon: _jsx(Refresh, {}), sx: {
                                        backgroundColor: 'white',
                                        color: 'success.main',
                                        '&:hover': {
                                            backgroundColor: 'grey.100',
                                        },
                                        textTransform: 'none',
                                        fontWeight: 600,
                                    }, children: "Update Now" }), onDismiss && (_jsx(Button, { variant: "text", onClick: onDismiss, sx: {
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                        },
                                        textTransform: 'none',
                                    }, children: "Later" }))] })] }), onDismiss && (_jsx(IconButton, { onClick: onDismiss, sx: {
                        color: 'white',
                        '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                    }, children: _jsx(Close, {}) }))] }) }));
};
export default PWAUpdateNotification;
