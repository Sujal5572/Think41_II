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

// --- Import Mongoose Models ---
// For chat history
const Conversation = require('./models/Conversation');
const Message = require('./models/Message'); // <-- CORRECTED LINE: Removed the extra '= require'

// For e-commerce data queries (Milestone 5)
const Product = require('./models/Product');
const Order = require('./models/Order');
const InventoryItem = require('./models/InventoryItem');

// --- Import LLM Service ---
const { getLlmResponse } = require('./llmService'); // Import your LLM service

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

// Primary Chat Endpoint (Milestone 4 & 5)
// Handles user messages, stores them, and provides a basic AI response.
app.post('/api/chat', async (req, res) => {
    const { message, conversation_id, user_id } = req.body;

    // Basic validation: Ensure a message is provided.
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Use 'anonymous_user' if no user_id is provided, for basic user tracking.
    const currentUserId = user_id || 'anonymous_user';

    let conversation;
    let currentSessionId = conversation_id;
    let chatHistory = []; // To store messages for LLM context

    try {
        // Find or create conversation
        if (conversation_id) {
            // Populate 'messages' to get the full message documents, not just ObjectIDs
            conversation = await Conversation.findOne({ sessionId: conversation_id, userId: currentUserId }).populate('messages');
            if (conversation) {
                chatHistory = conversation.messages; // Load previous messages for context
            } else {
                // If ID was provided but not found, treat as a new session
                currentSessionId = `new_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                conversation = new Conversation({ userId: currentUserId, sessionId: currentSessionId, messages: [] });
                await conversation.save(); // Save to get an _id before adding messages
            }
        } else {
            // New conversation
            currentSessionId = `new_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            conversation = new Conversation({ userId: currentUserId, sessionId: currentSessionId, messages: [] });
            await conversation.save(); // Save to get an _id before adding messages
        }

        // Store user message
        const userMsg = new Message({ conversationId: conversation._id, sender: 'user', text: message });
        await userMsg.save();
        conversation.messages.push(userMsg._id); // Push the ObjectId reference

        let aiResponseText;
        let dataForLlm = ''; // String to hold relevant data from DB for the LLM

        // --- Milestone 5: Simple Business Logic / Intent Recognition ---
        // This section tries to identify user intent and fetch data from your MongoDB.

        // Example 1: Check Order Status (looks for "order" or "id" followed by a number)
        const orderIdMatch = message.match(/(?:order|id)\s*#?(\d+)/i);
        if (orderIdMatch) {
            const orderId = parseInt(orderIdMatch[1]);
            console.log(`User asked about order ID: ${orderId}. Checking database...`);
            // Find order by its original CSV ID and link to the user if possible
            const order = await Order.findOne({ csvOrderId: orderId, user: conversation.user }); 
            
            if (order) {
                // Fetch order items and populate product details for a richer response
                const orderItems = await OrderItem.find({ order: order._id }).populate('product');
                dataForLlm = `Order ID ${order.csvOrderId} details:\nStatus: ${order.status}\nCreated At: ${order.orderCreatedAt}\nShipped At: ${order.shippedAt || 'N/A'}\nDelivered At: ${order.deliveredAt || 'N/A'}\nNumber of Items: ${order.numOfItems}.\nItems: ${orderItems.map(item => `${item.product ? item.product.name : 'Unknown Product'} (Qty: ${item.itemType || 'N/A'})`).join(', ')}.`;
                console.log("Found order data:", dataForLlm);
            } else {
                dataForLlm = `No order found with ID ${orderId}.`;
                console.log("No order data found.");
            }
        } 
        
        // Example 2: Check Product Stock (looks for "stock", "quantity", or "how many" followed by a product name)
        // Only attempt this if no order status query was handled already
        const productStockMatch = message.match(/(?:stock|quantity|how many)\s+(.*)(?:in stock)?/i);
        if (!dataForLlm && productStockMatch) { 
            const productName = productStockMatch[1].trim();
            console.log(`User asked about stock for product: "${productName}". Checking database...`);
            // Find products that match (case-insensitive search for product name)
            const products = await Product.find({ name: { $regex: new RegExp(productName, 'i') } }).limit(5); // Limit search results

            if (products.length > 0) {
                let stockDetails = [];
                for (const prod of products) {
                    // Find inventory for each matched product
                    const inventory = await InventoryItem.find({ product: prod._id }).populate('distributionCenter');
                    const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
                    stockDetails.push(`${prod.name} (Brand: ${prod.brand || 'N/A'}): Total Stock - ${totalStock} units across ${inventory.length} locations.`);
                }
                dataForLlm = `Product stock details: ${stockDetails.join('\n')}`;
                console.log("Found product stock data:", dataForLlm);
            } else {
                dataForLlm = `No product found matching "${productName}".`;
                console.log("No product stock data found.");
            }
        }

        // ... (existing /health and /api/chat routes) ...

// New: Get a list of all conversation sessions
app.get('/api/conversations', async (req, res) => {
    try {
        // Fetch only necessary fields for the history panel display
        const conversations = await Conversation.find({}, 'sessionId userId createdAt').sort({ createdAt: -1 }).limit(50); // Limit to last 50 for performance
        res.status(200).json(conversations);
    } catch (error) {
        console.error('Error fetching conversation list:', error);
        res.status(500).json({ error: 'Failed to fetch conversation list' });
    }
});

// New: Get messages for a specific conversation session
app.get('/api/conversations/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const conversation = await Conversation.findOne({ sessionId: sessionId }).populate('messages');

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }
        // Return messages sorted by timestamp to ensure chronological order
        const sortedMessages = conversation.messages.sort((a, b) => a.timestamp - b.timestamp);
        res.status(200).json(sortedMessages);
    } catch (error) {
        console.error('Error fetching conversation messages:', error);
        res.status(500).json({ error: 'Failed to fetch conversation messages' });
    }
});

// ... (rest of your index.js code, e.g., app.listen) ...

        // --- Call LLM for final response generation ---
        // Prepare the prompt for the LLM, including user query and any relevant database data.
        let llmPrompt = `User's query: "${message}".`;
        if (dataForLlm) {
            llmPrompt += ` Relevant database information: "${dataForLlm}".`;
        }
        llmPrompt += ` Please respond to the user's query conversationally and helpfully based on the information provided, or ask for more details if needed to fulfill the request.`;

        // Get the response from the LLM service
        aiResponseText = await getLlmResponse(llmPrompt, chatHistory);
        console.log("LLM generated response:", aiResponseText);

        // Store AI response
        const aiMsg = new Message({ conversationId: conversation._id, sender: 'ai', text: aiResponseText });
        await aiMsg.save();
        conversation.messages.push(aiMsg._id); // Push the ObjectId reference

        await conversation.save(); // Save the conversation with new message references

        // Send back the AI's response and the conversation ID for continued interaction
        res.status(200).json({
            message: aiResponseText,
            conversation_id: conversation.sessionId,
            status: 'success'
        });

    } catch (error) {
        console.error('Error in /api/chat endpoint:', error);
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