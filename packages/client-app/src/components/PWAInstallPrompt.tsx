import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  Chip,
} from '@mui/material';
import {
  GetApp,
  Close,
  PhoneAndroid,
  Computer,
} from '@mui/icons-material';

interface PWAInstallPromptProps {
  onInstall: () => void;
  onDismiss?: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onInstall,
  onDismiss,
}) => {
  return (
    <Paper
      elevation={8}
      sx={{
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
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <GetApp sx={{ fontSize: 20 }} />
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              Install Gon Voice Assistant
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
            Get the full app experience with offline access and faster loading
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip
              icon={<PhoneAndroid />}
              label="Mobile App"
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            <Chip
              icon={<Computer />}
              label="Desktop App"
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={onInstall}
              startIcon={<GetApp />}
              sx={{
                backgroundColor: 'white',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'grey.100',
                },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Install App
            </Button>
            
            {onDismiss && (
              <Button
                variant="text"
                onClick={onDismiss}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                  textTransform: 'none',
                }}
              >
                Maybe Later
              </Button>
            )}
          </Box>
        </Box>
        
        {onDismiss && (
          <IconButton
            onClick={onDismiss}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <Close />
          </IconButton>
        )}
      </Box>
    </Paper>
  );
};

export default PWAInstallPrompt;
