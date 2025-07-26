import React, { useState } from 'react';

const ChatInput = ({ onSendMessage, isLoading }) => { // Receive isLoading prop
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isLoading) { // Don't send if loading
            onSendMessage(input);
            setInput('');
        }
    };

    return (
        <form className="chat-input-form" onSubmit={handleSubmit}>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isLoading ? "Thinking..." : "Type your message..."} // Placeholder changes with loading state
                className="chat-input-field"
                disabled={isLoading} // Disable input while loading
            />
            <button type="submit" className="chat-send-button" disabled={isLoading}> {/* Disable button */}
                {isLoading ? "Sending..." : "Send"}
            </button>
        </form>
    );
};

export default ChatInput;