const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: { type: String, required: true, unique: true }, 
    validFrom: { type: Date, required: true }, 
    validUpto: { type: Date, required: true },
    discountPercentage: { type: Number, required: true }, 
    minPrice: { type: Number, required: true },
    maxDiscount: { type: Number, required: true }, 
    couponCount: { type: Number, required: true, default: 0 }, 
    status: { type: Boolean, default: true }, 
    createdAt: { type: Date, default: Date.now }, 
    updatedAt: { type: Date, default: Date.now }, 
    isDeleted: { type: Boolean, default: false },
})

module.exports = mongoose.model('Coupon',couponSchema)