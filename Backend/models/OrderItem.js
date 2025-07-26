const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    // csvId is used to store the original 'id' from your order_items.csv
    csvId: { type: Number, required: true, unique: true }, 
    // Reference to the Order document's _id
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    // Reference to the Product document's _id
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    itemType: { type: String },
    salePrice: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('OrderItem', orderItemSchema);