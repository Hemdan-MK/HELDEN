const mongoose = require('mongoose')

const addressSchema=mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    housename: { type: String },
    country: { type: String },
    state: { type: String },
    district: { type: String },
    city: { type: String },
    pincode: { type: String }
})


module.exports =mongoose.model("Address", addressSchema)