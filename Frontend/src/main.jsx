import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ChatProvider } from './context/ChatContext.jsx'; // Import ChatProvider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChatProvider> {/* Wrap App with ChatProvider */}
      <App />
    </ChatProvider>
  </React.StrictMode>,
);