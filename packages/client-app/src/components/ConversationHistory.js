import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, Card, CardContent, Avatar, IconButton, Divider, Button, } from '@mui/material';
import { PlayArrow, Delete, Person, SmartToy, } from '@mui/icons-material';
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
const ConversationHistory = () => {
    const handlePlayResponse = (response) => {
        // This would integrate with the voice assistant to speak the response
        console.log('Playing response:', response);
    };
    const handleDeleteConversation = (id) => {
        // This would delete the conversation from storage
        console.log('Deleting conversation:', id);
    };
    return (_jsxs(Box, { sx: { maxWidth: 800, mx: 'auto' }, children: [_jsxs(Box, { sx: { mb: 4 }, children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "Conversation History" }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "Your recent conversations with Gon" })] }), mockConversations.length === 0 ? (_jsx(Card, { children: _jsxs(CardContent, { sx: { textAlign: 'center', py: 6 }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", gutterBottom: true, children: "No conversations yet" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "Start talking to Gon to see your conversation history here" })] }) })) : (_jsx(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: mockConversations.map((conversation) => (_jsx(Card, { sx: { position: 'relative' }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: conversation.timestamp.toLocaleString() }), _jsx(IconButton, { size: "small", onClick: () => handleDeleteConversation(conversation.id), sx: { color: 'error.main' }, children: _jsx(Delete, {}) })] }), _jsxs(Box, { sx: { display: 'flex', gap: 2, mb: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: 'primary.main', width: 32, height: 32 }, children: _jsx(Person, {}) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "body1", sx: { fontWeight: 500 }, children: "You said:" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: conversation.userMessage })] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsxs(Box, { sx: { display: 'flex', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: 'secondary.main', width: 32, height: 32 }, children: _jsx(SmartToy, {}) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }, children: [_jsx(Typography, { variant: "body1", sx: { fontWeight: 500 }, children: "Gon says:" }), _jsx(IconButton, { size: "small", onClick: () => handlePlayResponse(conversation.assistantResponse), sx: { color: 'primary.main' }, children: _jsx(PlayArrow, {}) })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: conversation.assistantResponse })] })] })] }) }, conversation.id))) })), mockConversations.length > 0 && (_jsx(Box, { sx: { mt: 4, textAlign: 'center' }, children: _jsx(Button, { variant: "outlined", color: "error", onClick: () => console.log('Clear all conversations'), children: "Clear All Conversations" }) }))] }));
};
export default ConversationHistory;
