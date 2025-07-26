import React, { useEffect } from 'react';
import { useChat } from '../context/ChatContext.jsx'; // Import useChat hook

const HistoryPanel = () => {
    const { pastConversations, fetchPastConversations, loadConversationHistory, startNewConversation, conversationId } = useChat();

    useEffect(() => {
        fetchPastConversations(); // Fetch history when component mounts
        // Optionally, refresh past conversations after a new conversation starts/ends
    }, [fetchPastConversations, conversationId]); // Refresh if active conversation changes

    const formatSessionId = (id) => {
        if (!id) return "New Conversation";
        // Make ID more human-readable, e.g., last few chars
        return `Session ...${id.slice(-6)}`;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="history-panel">
            <h2>Past Conversations</h2>
            <button onClick={startNewConversation} className="new-chat-button">
                + Start New Chat
            </button>
            <div className="conversation-list">
                {pastConversations.length > 0 ? (
                    pastConversations.map((conv) => (
                        <div
                            key={conv.sessionId}
                            className={`conversation-item ${conv.sessionId === conversationId ? 'active' : ''}`}
                            onClick={() => loadConversationHistory(conv.sessionId)}
                        >
                            <span className="session-id">{formatSessionId(conv.sessionId)}</span>
                            <span className="session-date">{formatTimestamp(conv.createdAt)}</span>
                        </div>
                    ))
                ) : (
                    <p className="no-history-message">No past conversations yet.</p>
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;