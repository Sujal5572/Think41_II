const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' }); // Correctly loads environment variables from .env

const app = express();
const PORT = process.env.PORT || 8080; // Uses PORT from .env, or defaults to 8080

// --- Middleware ---
// 1) Enable CORS for all origins & methods—globally. Essential for frontend communication.
app.use(cors());  

// 2) Parse JSON bodies from incoming requests.
app.use(express.json());

// --- Import Mongoose Models for Chat History ---
// These models are used to store the conversation flow between the user and the chatbot.
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// --- MongoDB Connection ---
// Establishes the connection to your MongoDB Atlas database.
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,      // Recommended options for compatibility
  useUnifiedTopology: true,   // Recommended options for compatibility
})
.then(() => {
  console.log("Connected to MongoDB Atlas!");
  // This is where you might set up initial data or check DB status if needed.
})
.catch((error) => {
  console.error("MongoDB connection error:", error);
  // It's good practice to exit if the database connection fails,
  // as the application cannot function without it.
  process.exit(1); 
});

// --- API Routes ---

// Health check endpoint: Simple GET request to ensure the server is running.
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Backend service is running!' });
});

// Primary Chat Endpoint (Milestone 4: Core Chat API)
// Handles user messages, stores them, and provides a basic AI response.
app.post('/api/chat', async (req, res) => {
    const { message, conversation_id, user_id } = req.body;

    // Basic validation: Ensure a message is provided.
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Use 'anonymous_user' if no user_id is provided, for basic user tracking.
    const currentUserId = user_id || 'anonymous_user';

    // Placeholder for LLM integration (This will be expanded in Milestone 5).
    const aiResponseText = `You said: '${message}'. I am a chatbot and will process this soon!`; 

    try {
        let conversation;
        let currentSessionId = conversation_id;

        // Check if this is a continuation of an existing conversation
        if (conversation_id) {
            // Try to find the conversation by session ID and user ID
            conversation = await Conversation.findOne({ sessionId: conversation_id, userId: currentUserId });

            // If the provided conversation_id doesn't exist (e.g., first message of a new session
            // where frontend might still send an ID, or an invalid ID was passed), create a new one.
            if (!conversation) {
                // Generate a new unique session ID
                currentSessionId = `new_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                conversation = new Conversation({
                    userId: currentUserId,
                    sessionId: currentSessionId,
                    messages: [] // Initialize with an empty array of messages
                });
            }
        } else {
            // If no conversation_id is provided, it's definitely a new conversation.
            // Generate a new unique session ID.
            currentSessionId = `new_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            conversation = new Conversation({
                userId: currentUserId,
                sessionId: currentSessionId,
                messages: []
            });
        }

        // Create and save the user's message
        const userMsg = new Message({ conversationId: conversation._id, sender: 'user', text: message });
        await userMsg.save();

        // Create and save the AI's response message
        const aiMsg = new Message({ conversationId: conversation._id, sender: 'ai', text: aiResponseText });
        await aiMsg.save();

        // Link messages to the conversation
        conversation.messages.push(userMsg._id);
        conversation.messages.push(aiMsg._id);

        // Save the updated conversation (with new message references)
        await conversation.save();

        // Send back the AI's response and the conversation ID for continued interaction
        res.status(200).json({
            message: aiResponseText,
            conversation_id: conversation.sessionId, // Return the session ID to the frontend
            status: 'success'
        });

    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).json({ error: 'Internal server error during chat processing' });
    }
});

// --- Start Server ---
// The server listens for incoming HTTP requests on the specified port.
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Access health check at http://localhost:${PORT}/health`);
  console.log(`Access chat API at http://localhost:${PORT}/api/chat (POST)`);
});