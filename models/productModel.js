const { type } = require('express/lib/response');
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    offerPrice: { type: Number },
    prevOfferPrice: {
        type: Number,
        // default: function () {
        //     return this.offerPrice; // Assign offerPrice as default for prevOfferPrice
        // }
    },
    images: [{ type: String }], // Store image paths
    tags: [{ type: String }],
    productType: { type: String, required: true },
    stockManagement: [
        {
            size: {
                type: String,
                required: true,
                trim: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 0,
                default: 0
            }
        }
    ],
    category: { type: mongoose.Schema.ObjectId, ref: 'Category' },
    brand: { type: String },
    warranty: { type: String },
    returnPolicy: { type: String },
    rating: { type: Number, default: 0 },
    reviews: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
            rating: { type: Number, required: true },
            comment: { type: String },
        },
    ],
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Products', productSchema);













