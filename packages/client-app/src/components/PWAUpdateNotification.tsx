import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Update,
  Close,
  Refresh,
} from '@mui/icons-material';

interface PWAUpdateNotificationProps {
  onUpdate: () => void;
  onDismiss?: () => void;
}

const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({
  onUpdate,
  onDismiss,
}) => {
  return (
    <Paper
      elevation={8}
      sx={{
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
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Update sx={{ fontSize: 20 }} />
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              New Version Available
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
            A new version of Gon Voice Assistant is available with improved features and performance
          </Typography>
          
          <Alert 
            severity="info" 
            sx={{ 
              mb: 2, 
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              '& .MuiAlert-icon': { color: 'white' },
            }}
          >
            <Typography variant="body2">
              Update now to get the latest features and security improvements
            </Typography>
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={onUpdate}
              startIcon={<Refresh />}
              sx={{
                backgroundColor: 'white',
                color: 'success.main',
                '&:hover': {
                  backgroundColor: 'grey.100',
                },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Update Now
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
                Later
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

export default PWAUpdateNotification;
