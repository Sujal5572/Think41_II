const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // To identify which user this conversation belongs to
    sessionId: { type: String, required: true, unique: true }, // Unique identifier for each chat session
    createdAt: { type: Date, default: Date.now },
    // An array of Message subdocuments to store the turn-by-turn chat
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }] 
});

module.exports = mongoose.model('Conversation', conversationSchema);