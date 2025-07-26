const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // csvOrderId is used to store the original 'order_id' from your orders.csv
    csvOrderId: { type: Number, required: true, unique: true }, 
    // Reference to the User document's _id
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, required: true },
    gender: { type: String }, 
    orderCreatedAt: { type: Date, required: true }, // Renamed to avoid conflict with Mongoose's default 'createdAt'
    returnedAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    numOfItems: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);