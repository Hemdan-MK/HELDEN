const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0
    },
    transactions: [{
        amount: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            enum: ['Credit', 'Debit'],
            required: true
        },
        description: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    updatedAt: { type: Date, default: Date.now() },
})

module.exports = mongoose.model("wallet", walletSchema)