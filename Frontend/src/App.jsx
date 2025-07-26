import React, { useEffect } from 'react';
import ChatWindow from './components/ChatWindow.jsx';
import ChatInput from './components/ChatInput.jsx';
import HistoryPanel from './components/HistoryPanel.jsx'; // New: Import HistoryPanel
import { useChat } from './context/ChatContext.jsx'; // Import useChat hook
import './App.css'; 

function App() {
    const { messages, sendMessage, isLoading, fetchPastConversations } = useChat();

    // Fetch past conversations when the component mounts
    useEffect(() => {
        fetchPastConversations();
    }, [fetchPastConversations]); // Dependency array to ensure it runs once

    return (
        <div className="App">
            <header className="App-header">
                <h1>ThinkBot Chatbot</h1>
            </header>
            <div className="main-content"> {/* New div to hold chat and history */}
                <HistoryPanel /> {/* New: History Panel */}
                <div className="chat-area"> {/* Chat window and input */}
                    <ChatWindow messages={messages} />
                    <ChatInput onSendMessage={sendMessage} isLoading={isLoading} /> {/* Pass isLoading */}
                    {isLoading && <div className="loading-indicator">Thinking...</div>} {/* Loading indicator */}
                </div>
            </div>
        </div>
    );
}

export default App;