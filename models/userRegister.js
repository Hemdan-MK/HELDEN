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
    isValid: { type: Boolean, default: false },
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    referralCount: { type: Number, default: 0 }
});

async function generateUniqueCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    let isUnique = false;
    let code;

    while (!isUnique) {
        // Generate a random code
        code = '';
        for (let i = 0; i < codeLength; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters[randomIndex];
        }

        // Check if code exists using the schema
        const existingUser = await mongoose.model('users').findOne({ referralCode: code });
        if (!existingUser) {
            isUnique = true;
        }
    }
    console.log('referral: ' + code);
    return code;
}

// Define the pre-save middleware BEFORE creating the model
userSchema.pre('save', async function (next) {
    if (!this.referralCode) {
        this.referralCode = await generateUniqueCode();
    }
    next();
});

// Create the model AFTER defining the middleware
const User = mongoose.model("users", userSchema);

module.exports = User;