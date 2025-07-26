import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

// Create the Chat Context
const ChatContext = createContext();

// Custom hook to use the Chat Context
export const useChat = () => {
    // This hook must be called inside a component wrapped by ChatProvider
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

// Chat Provider component
export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // State for loading indicator
    const [pastConversations, setPastConversations] = useState([]); // State for M8 history panel
    
    // Example user ID - in a real app, this would come from authentication
    const userId = "test_user_roshan";

    // Function to send a message to the backend
    const sendMessage = useCallback(async (text) => {
        const newUserMessage = { sender: 'user', text: text };
        setMessages((prevMessages) => [...prevMessages, newUserMessage]);
        setIsLoading(true); // Set loading true when sending message

        try {
            const response = await axios.post('http://localhost:8080/api/chat', {
                message: text,
                conversation_id: conversationId,
                user_id: userId
            });

            const backendResponse = response.data;
            
            if (backendResponse.conversation_id && backendResponse.conversation_id !== conversationId) {
                setConversationId(backendResponse.conversation_id);
            }

            const newAiMessage = { sender: 'ai', text: backendResponse.message };
            setMessages((prevMessages) => [...prevMessages, newAiMessage]);

        } catch (error) {
            console.error('Error sending message to backend:', error);
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'ai', text: "Oops! I'm having trouble connecting to the AI. Please try again." }
            ]);
        } finally {
            setIsLoading(false); // Set loading false after response (or error)
        }
    }, [conversationId, userId]); // Dependencies for useCallback

    // Function to fetch past conversations for the history panel (M8)
    const fetchPastConversations = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:8080/api/conversations');
            setPastConversations(response.data);
        } catch (error) {
            console.error('Error fetching past conversations:', error);
        }
    }, []);

    // Function to load a specific past conversation's history (M8)
    const loadConversationHistory = useCallback(async (sessionIdToLoad) => {
        setIsLoading(true); // Show loading while fetching history
        try {
            const response = await axios.get(`http://localhost:8080/api/conversations/${sessionIdToLoad}`);
            setMessages(response.data); // Replace current messages with history
            setConversationId(sessionIdToLoad); // Set this as the active conversation
            console.log(`Loaded history for session: ${sessionIdToLoad}`);
        } catch (error) {
            console.error('Error loading conversation history:', error);
            setMessages([{ sender: 'ai', text: "Could not load conversation history. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Value provided by the context to its consumers
    const contextValue = {
        messages,
        sendMessage,
        isLoading,
        conversationId,
        fetchPastConversations,
        pastConversations,
        loadConversationHistory,
        startNewConversation: () => {
            setMessages([]);
            setConversationId(null);
        }
    };

    return (
        <ChatContext.Provider value={contextValue}>
            {children}
        </ChatContext.Provider>
    );
};