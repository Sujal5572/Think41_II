import React from 'react';

const Message = ({ sender, text }) => {
    const messageClass = sender === 'user' ? 'user-message' : 'ai-message';
    const senderName = sender === 'user' ? 'You' : 'ThinkBot';

    return (
        <div className={`chat-message ${messageClass}`}>
            <strong>{senderName}:</strong> {text}
        </div>
    );
};

export default Message;