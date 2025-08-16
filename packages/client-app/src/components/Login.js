import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Link, Divider, IconButton, InputAdornment, } from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Google, Facebook, } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
const Login = () => {
    const { login, isLoggingIn, error, clearError } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        login(formData);
    };
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };
    return (_jsx(Box, { sx: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 2,
        }, children: _jsxs(Paper, { elevation: 8, sx: {
                p: 4,
                borderRadius: 3,
                maxWidth: 400,
                width: '100%',
            }, children: [_jsxs(Box, { sx: { textAlign: 'center', mb: 4 }, children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, sx: { fontWeight: 700 }, children: "\uD83C\uDFAD Gon Voice Assistant" }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "Sign in to your account" })] }), error && (_jsx(Alert, { severity: "error", sx: { mb: 3 }, onClose: clearError, children: error })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(TextField, { fullWidth: true, label: "Email", name: "email", type: "email", value: formData.email, onChange: handleChange, required: true, margin: "normal", InputProps: {
                                startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(Email, { color: "action" }) })),
                            } }), _jsx(TextField, { fullWidth: true, label: "Password", name: "password", type: showPassword ? 'text' : 'password', value: formData.password, onChange: handleChange, required: true, margin: "normal", InputProps: {
                                startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(Lock, { color: "action" }) })),
                                endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowPassword(!showPassword), edge: "end", children: showPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) })),
                            } }), _jsx(Button, { type: "submit", fullWidth: true, variant: "contained", size: "large", disabled: isLoggingIn, sx: { mt: 3, mb: 2, py: 1.5 }, children: isLoggingIn ? 'Signing In...' : 'Sign In' })] }), _jsx(Divider, { sx: { my: 3 }, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "OR" }) }), _jsxs(Box, { sx: { display: 'flex', gap: 2, mb: 3 }, children: [_jsx(Button, { fullWidth: true, variant: "outlined", startIcon: _jsx(Google, {}), sx: { textTransform: 'none' }, children: "Google" }), _jsx(Button, { fullWidth: true, variant: "outlined", startIcon: _jsx(Facebook, {}), sx: { textTransform: 'none' }, children: "Facebook" })] }), _jsx(Box, { sx: { textAlign: 'center' }, children: _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Don't have an account?", ' ', _jsx(Link, { href: "#", underline: "hover", children: "Sign up" })] }) })] }) }));
};
export default Login;
