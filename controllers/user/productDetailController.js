const categoryModel = require('../../models/categoryModel');
const Cart = require('../../models/cartModel');  // Assuming you have a Cart model
const Product = require('../../models/productModel');  // Assuming you have a Product model
const mongoose = require("mongoose");


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
    const { productId, size, color, quantity } = req.body;
    const userId = req.user.id; // Assume user is authenticated
    console.log('--------------------------------');
    console.log(req.body);
    console.log('--------------------------------');

    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const existingProductIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId &&
            item.size === size &&
            item.color === color
        );

        if (existingProductIndex !== -1) {
            cart.items[existingProductIndex].quantity += parseInt(quantity);
        } else {
            cart.items.push({
                productId,
                size,
                color,
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
        const productId = req.params.id;
        console.log('productId : ' + productId);

        

        // Fetch stock from your database (example query)
        const product = await Product.findById(productId);
        console.log(product);
        
        if (product) {
            res.json({ success: true, stock: product.stock });
        } else {
            res.status(404).json({ success: false, stock: 0, message: "Product not found" });
        }
    } catch (error) {
        console.error("Error fetching product stock:", error);
        res.status(500).json({ stock: 0, message: "Internal Server Error" });
    }
};



module.exports = {
    getProductDetail,
    addToCart,
    stock
    // loadSession
}