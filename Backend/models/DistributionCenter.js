const mongoose = require('mongoose');

const distributionCenterSchema = new mongoose.Schema({
    // csvId is used to store the original 'id' from your distribution_centers.csv
    csvId: { type: Number, required: true, unique: true }, 
    name: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('DistributionCenter', distributionCenterSchema);