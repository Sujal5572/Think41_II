const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // csvId is used to store the original 'id' from your products.csv
    csvId: { type: Number, required: true, unique: true }, 
    cost: { type: Number, required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    retailPrice: { type: Number, required: true },
    department: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    // Temporarily store the CSV ID for the distribution center during data loading.
    // This will be replaced by a proper MongoDB ObjectId reference later.
    csvDistributionCenterId: { type: Number }, 
    // This is the actual reference to the DistributionCenter document
    distributionCenter: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributionCenter' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);