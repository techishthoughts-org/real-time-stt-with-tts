import React from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
          maxWidth: 400,
          width: '100%',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          🎭 Gon Voice Assistant
        </Typography>
        
        <CircularProgress size={60} sx={{ my: 3 }} />
        
        <Typography variant="body1" color="text.secondary">
          Loading your personal AI companion...
        </Typography>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Initializing voice recognition and AI services
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoadingScreen;
