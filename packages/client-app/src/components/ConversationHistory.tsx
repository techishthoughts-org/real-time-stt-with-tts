import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  PlayArrow,
  Delete,
  Person,
  SmartToy,
} from '@mui/icons-material';

// Mock data for demonstration
const mockConversations = [
  {
    id: '1',
    timestamp: new Date('2025-01-15T10:30:00'),
    userMessage: 'Olá Gon, como você está?',
    assistantResponse: 'Oi! Estou muito bem, obrigado por perguntar! Como posso te ajudar hoje?',
  },
  {
    id: '2',
    timestamp: new Date('2025-01-15T10:25:00'),
    userMessage: 'Que horas são?',
    assistantResponse: 'São 10:25 da manhã. Tem algum compromisso importante hoje?',
  },
  {
    id: '3',
    timestamp: new Date('2025-01-15T10:20:00'),
    userMessage: 'Conte uma piada',
    assistantResponse: 'Por que o livro de matemática está triste? Porque tem muitos problemas! 😄',
  },
];

const ConversationHistory: React.FC = () => {
  const handlePlayResponse = (response: string) => {
    // This would integrate with the voice assistant to speak the response
    console.log('Playing response:', response);
  };

  const handleDeleteConversation = (id: string) => {
    // This would delete the conversation from storage
    console.log('Deleting conversation:', id);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Conversation History
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your recent conversations with Gon
        </Typography>
      </Box>

      {mockConversations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No conversations yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start talking to Gon to see your conversation history here
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mockConversations.map((conversation) => (
            <Card key={conversation.id} sx={{ position: 'relative' }}>
              <CardContent>
                {/* Timestamp */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {conversation.timestamp.toLocaleString()}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteConversation(conversation.id)}
                    sx={{ color: 'error.main' }}
                  >
                    <Delete />
                  </IconButton>
                </Box>

                {/* User Message */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <Person />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      You said:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {conversation.userMessage}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Assistant Response */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                    <SmartToy />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Gon says:
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handlePlayResponse(conversation.assistantResponse)}
                        sx={{ color: 'primary.main' }}
                      >
                        <PlayArrow />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {conversation.assistantResponse}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Clear All Button */}
      {mockConversations.length > 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            color="error"
            onClick={() => console.log('Clear all conversations')}
          >
            Clear All Conversations
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ConversationHistory;
