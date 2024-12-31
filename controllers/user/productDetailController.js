const categoryModel = require('../../models/categoryModel');
const Cart = require('../../models/cartModel');  // Assuming you have a Cart model
const Product = require('../../models/productModel');  // Assuming you have a Product model
const mongoose = require("mongoose");
const { success } = require('./orderCheckController');


const getProductDetail = async (req, res) => {
    try {
        // Get product ID from route parameters
        const productId = req.params.id;

        // Fetch product from the database
        const product = await Product.findById(productId);
        const productAll = await Product.find({ isDeleted: false });
        const category = await categoryModel.findById(product.category)
        // const related1 = await productModel.find({ tags: product.tags })
        const related = await Product.find({
            tags: { $in: product.tags },  // Match products with any tag from the current product's tags
            _id: { $ne: product._id }    // Exclude the current product
        });

        // Check if the product exists
        if (!product) {
            return res.status(404).send('Product not found');
        }
        console.log(product);


        // Render the product detail page and pass the product data to the view
        return res.status(200).render('user/productPage', { product, user: req.session.user, productAll, category, related });
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).send('Server error');
    }
}



// Add product to cart
const addToCart = async (req, res) => {
    const { productId, size, quantity } = req.body;
    const userId = req.session.user.id; // Assume user is authenticated

    try {

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Check if the size exists in stockManagement
        const sizeStock = product.stockManagement.find(stock => stock.size === size);

        if (!sizeStock) {
            return res.status(400).json({ success: false, message: "Invalid size selected" });
        }

        // Check if the requested quantity is available
        if (sizeStock.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${sizeStock.quantity} items available in size ${size}`
            });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const existingProductIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId &&
            item.size === size
        );

        if (existingProductIndex !== -1) {
            // Update the quantity in the cart
            cart.items[existingProductIndex].quantity += parseInt(quantity);
            // Ensure the quantity doesn't exceed available stock
            if (cart.items[existingProductIndex].quantity > sizeStock.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${sizeStock.quantity} items available in size ${size}`
                });
            }
            else if (cart.items[existingProductIndex].quantity > 5) {
                return res.status(400).json({
                    success: true,
                    problem: true,
                    message: `You can't add more than 5 same item in cart, right now you have ${cart.items[existingProductIndex].quantity - parseInt(quantity)} quantity of product`
                })
            }
        } else {
            // Add the new product with the selected size to the cart
            cart.items.push({
                productId,
                size,
                quantity: parseInt(quantity)
            });
        }

        await cart.save();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error adding to cart" });
    }
};



const stock = async (req, res) => {
    try {
        const productId = req.body.productId;
        const size = req.body.size;
        console.log('productId : ' + productId);
        console.log('size : ' + size);

        // Fetch stock from your database (example query)
        const product = await Product.findById(productId);
        console.log(product);

        if (product && product.stockManagement && Array.isArray(product.stockManagement)) {
            // Find the stock for the requested size
            const stockForSize = product.stockManagement.find(item => item.size === size);

            if (stockForSize) {
                return res.status(200).json({
                    success: true,
                    size: stockForSize.size,
                    stock: stockForSize.quantity
                });
            } else {
                return res.status(404).json({
                    success: false,
                    stock: 0,
                    message: `Stock not available for size: ${size}`
                });
            }
        }
        // Default stock response
        return res.status(404).json({
            success: false,
            stock: 0,
            message: "Product or stock details not found"
        });

    } catch (error) {
        console.error("Error fetching product stock:", error);
        res.status(500).json({ stock: 0, message: "Internal Server Error" });
    }
};



module.exports = {
    getProductDetail,
    addToCart,
    stock
}