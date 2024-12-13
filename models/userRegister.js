const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    phone: { type: Number, sparse: true, unique: true, default: null },
    address: [{
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        houseName: { type: String },
        street: { type: String },
        country: { type: String },
        state: { type: String },
        district: { type: String },
        city: { type: String },
        houseNumber: { type: Number },
        landmark: { type: String },
        pincode: { type: Number },
    }],
    role: { type: String, default: "user" },
    isDeleted: { type: Boolean, default: false },
    isGoogleLogin: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isValid: { type: Boolean, default: false }
});

module.exports = mongoose.model("users", userSchema);