const mongoose = require("mongoose");

const mongo = async () => {
    try {
        const conn = await mongoose.connect('mongodb://localhost:27017/e-commerce', {}); 
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

module.exports = mongo