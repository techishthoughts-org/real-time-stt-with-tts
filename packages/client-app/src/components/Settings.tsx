import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Button,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Mic,
  VolumeUp,
  Language,
  Speed,
  Notifications,
  Security,
  Palette,
  Storage,
} from '@mui/icons-material';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    autoSpeak: true,
    notifications: true,
    darkMode: false,
    offlineMode: false,
    voiceSpeed: 1.0,
    voicePitch: 1.0,
    language: 'pt-BR',
  });

  const handleSettingChange = (setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your Gon Voice Assistant experience
        </Typography>
      </Box>

      {/* Voice Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Mic />
            Voice Settings
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <VolumeUp />
              </ListItemIcon>
              <ListItemText
                primary="Auto-speak responses"
                secondary="Automatically speak AI responses"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.autoSpeak}
                  onChange={(e) => handleSettingChange('autoSpeak', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Speed />
              </ListItemIcon>
              <ListItemText
                primary="Voice Speed"
                secondary={`${settings.voiceSpeed}x`}
              />
              <ListItemSecondaryAction>
                <Box sx={{ width: 150 }}>
                  <Slider
                    value={settings.voiceSpeed}
                    onChange={(_, value) => handleSettingChange('voiceSpeed', value)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <VolumeUp />
              </ListItemIcon>
              <ListItemText
                primary="Voice Pitch"
                secondary={`${settings.voicePitch}x`}
              />
              <ListItemSecondaryAction>
                <Box sx={{ width: 150 }}>
                  <Slider
                    value={settings.voicePitch}
                    onChange={(_, value) => handleSettingChange('voicePitch', value)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Language />
            Language Settings
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <Language />
              </ListItemIcon>
              <ListItemText
                primary="Language"
                secondary="Select your preferred language"
              />
              <ListItemSecondaryAction>
                <FormControl sx={{ minWidth: 120 }}>
                  <Select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    size="small"
                  >
                    <MenuItem value="pt-BR">Português (BR)</MenuItem>
                    <MenuItem value="en-US">English (US)</MenuItem>
                    <MenuItem value="es-ES">Español</MenuItem>
                  </Select>
                </FormControl>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Palette />
            App Settings
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <Notifications />
              </ListItemIcon>
              <ListItemText
                primary="Push Notifications"
                secondary="Receive notifications about updates and features"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Palette />
              </ListItemIcon>
              <ListItemText
                primary="Dark Mode"
                secondary="Use dark theme for better visibility"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Storage />
              </ListItemIcon>
              <ListItemText
                primary="Offline Mode"
                secondary="Use local processing when possible"
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.offlineMode}
                  onChange={(e) => handleSettingChange('offlineMode', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security />
            Security & Privacy
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Your data is encrypted and stored securely. We never share your personal information.
          </Alert>
          
          <List>
            <ListItem>
              <ListItemText
                primary="Data Usage"
                secondary="Your conversations are processed locally when possible"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Privacy Policy"
                secondary="Read our privacy policy and terms of service"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={() => console.log('Save settings')}
        >
          Save Settings
        </Button>
        <Button
          variant="outlined"
          onClick={() => setSettings({
            autoSpeak: true,
            notifications: true,
            darkMode: false,
            offlineMode: false,
            voiceSpeed: 1.0,
            voicePitch: 1.0,
            language: 'pt-BR',
          })}
        >
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
