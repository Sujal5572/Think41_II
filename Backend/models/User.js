const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // csvId is used to store the original 'id' from your users.csv
    // This helps in mapping relationships during data loading.
    csvId: { type: Number, required: true, unique: true }, 
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Remember to hash passwords in a real app!
    age: { type: Number },
    gender: { type: String },
    streetAddress: { type: String },
    postalCode: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    trafficSource: { type: String },
}, { timestamps: true }); // Mongoose adds createdAt and updatedAt fields automatically

module.exports = mongoose.model('User', userSchema);