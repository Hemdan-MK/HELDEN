const Product = require('../models/productModel'); // Adjust the path to your Product model
const Cart = require('../models/cartModel'); // Adjust the path to your Product model



// Middleware to check product status
const checkProductStatus = async (req, res, next) => {
    try {
        if (req.session.checkProductStatus === true) {
            // If 'cartProducts' exists in request body, proceed with validation logic
            const { userId } = req.body;

            const cartProducts = await Cart.findOne({userId})            

            // Fetch products based on IDs
            const products = await Product.find({ _id: { $in: cartProducts } });

            // Check if any product has isDeleted: true
            const invalidProducts = products.filter(product => product.isDeleted);

            if (invalidProducts.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Some products are no longer available.',
                    invalidProducts: invalidProducts.map(p => p.name || p._id)
                });
            }

            // Proceed to next middleware/controller
            next();
        } else {
            // If 'cartProducts' does not exist, skip product check and proceed
            next();
        }
    } catch (error) {
        console.error('Error in checkProductStatus middleware:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error.' 
        });
    }
};

module.exports = checkProductStatus;
