const { type } = require("express/lib/response");
const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    type: {
        type: String,
        enum: ["product", "category"],

    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products" },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String },
    expiresAt: {
        type: Date,
        default: function () {
            return this.endDate;
        },
        index: { expireAfterSeconds: 0 }
    }
});

module.exports = mongoose.model("Offers", offerSchema);
