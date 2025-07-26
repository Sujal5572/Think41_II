const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY; // Ensure this is loaded from your .env

if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set in .env. LLM service will not function.");
}

async function getLlmResponse(prompt, existingChatHistory = []) {
    if (!GROQ_API_KEY) {
        return "I cannot provide an intelligent response because my API key is missing.";
    }

    try {
        const messages = [
            {
                role: "system",
                content: `You are an e-commerce customer support chatbot named "ThinkBot". Your primary goal is to assist users with inquiries about products, orders, and inventory for a clothing store.
                You have access to product, inventory, user, and order data.
                When asked about specific data (like order status, product stock), state that you are checking the database.
                Be helpful, concise, and friendly.
                If you need more information (e.g., an order ID or product name), ask clarifying questions.
                Always respond in a conversational and friendly tone.
                `
            },
            // Add existing chat history for context
            ...existingChatHistory.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant', // Map 'ai' to 'assistant'
                content: msg.text
            })),
            // Add the current user's prompt
            {
                role: "user",
                content: prompt,
            },
        ];

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama3-8b-8192", // Groq's recommended model for speed and general use
                messages: messages,
                temperature: 0.7, // Adjust for creativity vs. consistency
                max_tokens: 200, // Limit response length
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.choices[0].message.content;

    } catch (error) {
        console.error('Error communicating with Groq API:', error.response ? error.response.data : error.message);
        return "I'm sorry, I'm having trouble connecting to my AI brain right now. Please try again later.";
    }
}

module.exports = { getLlmResponse };