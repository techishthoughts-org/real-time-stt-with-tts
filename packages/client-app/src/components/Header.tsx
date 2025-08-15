import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Settings,
  Logout,
  History,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const handleNavigation = (path: string) => {
    handleClose();
    window.location.href = path;
  };

  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', color: 'text.primary' }}>
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
          🎭 Gon Voice Assistant
        </Typography>

        {/* Navigation Links - Desktop */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, mr: 2 }}>
          <Button
            color="inherit"
            onClick={() => window.location.href = '/'}
            sx={{ textTransform: 'none' }}
          >
            Home
          </Button>
          <Button
            color="inherit"
            onClick={() => window.location.href = '/conversations'}
            startIcon={<History />}
            sx={{ textTransform: 'none' }}
          >
            Conversations
          </Button>
          <Button
            color="inherit"
            onClick={() => window.location.href = '/settings'}
            startIcon={<Settings />}
            sx={{ textTransform: 'none' }}
          >
            Settings
          </Button>
        </Box>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="Connected"
            color="success"
            size="small"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          />
          
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user?.name?.[0] || <AccountCircle />}
            </Avatar>
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.name || 'User'}
              </Typography>
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/settings')}>
              <Settings sx={{ mr: 1 }} />
              Settings
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/conversations')}>
              <History sx={{ mr: 1 }} />
              Conversations
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
