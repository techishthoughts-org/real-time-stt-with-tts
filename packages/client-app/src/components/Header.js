import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Avatar, Menu, MenuItem, Box, Chip, } from '@mui/material';
import { Menu as MenuIcon, AccountCircle, Settings, Logout, History, } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
const Header = () => {
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const handleLogout = () => {
        handleClose();
        logout();
    };
    const handleNavigation = (path) => {
        handleClose();
        window.location.href = path;
    };
    return (_jsx(AppBar, { position: "static", elevation: 0, sx: { backgroundColor: 'white', color: 'text.primary' }, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { size: "large", edge: "start", color: "inherit", "aria-label": "menu", sx: { mr: 2, display: { sm: 'none' } }, children: _jsx(MenuIcon, {}) }), _jsx(Typography, { variant: "h6", component: "div", sx: { flexGrow: 1, fontWeight: 700 }, children: "\uD83C\uDFAD Gon Voice Assistant" }), _jsxs(Box, { sx: { display: { xs: 'none', sm: 'flex' }, gap: 2, mr: 2 }, children: [_jsx(Button, { color: "inherit", onClick: () => window.location.href = '/', sx: { textTransform: 'none' }, children: "Home" }), _jsx(Button, { color: "inherit", onClick: () => window.location.href = '/conversations', startIcon: _jsx(History, {}), sx: { textTransform: 'none' }, children: "Conversations" }), _jsx(Button, { color: "inherit", onClick: () => window.location.href = '/settings', startIcon: _jsx(Settings, {}), sx: { textTransform: 'none' }, children: "Settings" })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Chip, { label: "Connected", color: "success", size: "small", sx: { display: { xs: 'none', sm: 'flex' } } }), _jsx(IconButton, { size: "large", "aria-label": "account of current user", "aria-controls": "menu-appbar", "aria-haspopup": "true", onClick: handleMenu, color: "inherit", children: _jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: 'primary.main' }, children: user?.name?.[0] || _jsx(AccountCircle, {}) }) }), _jsxs(Menu, { id: "menu-appbar", anchorEl: anchorEl, anchorOrigin: {
                                vertical: 'bottom',
                                horizontal: 'right',
                            }, keepMounted: true, transformOrigin: {
                                vertical: 'top',
                                horizontal: 'right',
                            }, open: Boolean(anchorEl), onClose: handleClose, children: [_jsx(MenuItem, { disabled: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: user?.name || 'User' }) }), _jsxs(MenuItem, { onClick: () => handleNavigation('/settings'), children: [_jsx(Settings, { sx: { mr: 1 } }), "Settings"] }), _jsxs(MenuItem, { onClick: () => handleNavigation('/conversations'), children: [_jsx(History, { sx: { mr: 1 } }), "Conversations"] }), _jsxs(MenuItem, { onClick: handleLogout, children: [_jsx(Logout, { sx: { mr: 1 } }), "Logout"] })] })] })] }) }));
};
export default Header;
