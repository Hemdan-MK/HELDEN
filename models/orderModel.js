const mongoose = require('mongoose')


const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    addressId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    totalAmount: {
        type: Number,
        required: true
    },
    orderItems: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Products"
            },
            quantity: {
                type: Number,
                required: true
            },
            price: {
                type: Number,
            }
        }
    ],
    status: {
        type: String,
        enum: ['Pending', 'Cancelled', 'Shipping', 'Completed'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Net Banking'],
        default: 'Cash on Delivery'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 } // TTL index: document expires at this time
    }
})

module.exports = mongoose.model("Orders", orderSchema)