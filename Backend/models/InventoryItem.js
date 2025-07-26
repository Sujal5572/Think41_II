const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    // csvId is used to store the original 'id' from your inventory_items.csv
    csvId: { type: Number, required: true, unique: true }, 
    // Reference to the Product document's _id
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Reference to the DistributionCenter document's _id
    distributionCenter: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributionCenter', required: true },
    quantity: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);