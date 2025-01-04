const Wishlist = require('../../models/wishlistModel'); // Assuming you have the Wishlist model in models folder
const Product = require('../../models/productModel'); // Assuming you have the Product model to get product details
const Cart = require('../../models/cartModel');


const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id; // Logged-in user ID
        const page = parseInt(req.query.page) || 1; // Current page, default to 1
        const limit = 2; // Items per page
        const offset = (page - 1) * limit;

        // Fetch the user's wishlist
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId');

        if (!wishlist || !Array.isArray(wishlist.products)) {
            return res.render('user/wishlist', {
                wishlist: null,
                currentPage: page,
                totalPages: 1,
                user: req.session.user,
            });
        }

        // Total items and pagination logic
        const totalItems = wishlist.products.length;
        const totalPages = Math.ceil(totalItems / limit);

        // Paginate wishlist items
        const paginatedProducts = wishlist.products.slice(offset, offset + limit);

        // Render the wishlist page
        res.render('user/wishlist', {
            wishlist: paginatedProducts,
            currentPage: page,
            totalPages,
            user: req.session.user,
        });
    } catch (error) {
        console.error('Error loading wishlist:', error);
        res.status(500).send('Server Error');
    }
};

const addWishlist = async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user.id; // Assuming you have authentication middleware

    try {
        // Find the wishlist of the user (No need to populate when adding products)
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            // If no wishlist exists, create a new one
            wishlist = new Wishlist({ userId, products: [] });
        }

        // Check if the product already exists in the wishlist
        const productExists = wishlist.products.some(product => product.productId.toString() === productId);

        if (productExists) {
            return res.json({ success: false, message: "Product is already in your wishlist" });
        }

        // Add the product to the wishlist
        wishlist.products.push({ productId });

        // Save the updated wishlist
        await wishlist.save();

        res.json({ success: true, message: "Product has been added to your wishlist" });
    } catch (error) {
        console.error("Error adding product to wishlist:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}


const wishCart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId } = req.body;

        // Fetch the user's cart
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            // If no cart exists, create one
            cart = new Cart({ userId, items: [] });
        }

        // Check if product already exists in cart
        const productExists = cart.items.find(item => item.productId.toString() === productId);

        if (productExists) {
            await Wishlist.updateOne(
                { userId },
                { $pull: { products: { productId } } } // Remove the product from the wishlist
            );
            return res.json({
                success: false,
                message: 'This product is already in your cart.'
            });
        }

        // Add product to cart
        cart.items.push({ productId, quantity: 1 }); // Default quantity is 1
        await cart.save();
        
        await Wishlist.updateOne(
            { userId },
            { $pull: { products: { productId } } } // Remove the product from the wishlist
        );

        return res.json({
            success: true,
            message: 'Product successfully added to your cart.'
        });
    } catch (error) {
        console.error('Error adding product to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again.'
        });
    }
};


const deleteWish = async (req, res) => {
    try {
        // Ensure the user is logged in
        const userId = req.session?.user?.id; // Use optional chaining to avoid errors
        const { productId } = req.body; // Get the productId from the request body

        // Check if userId exists
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not logged in.",
            });
        }

        // Fetch the wishlist for the logged-in user
        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found.",
            });
        }

        // Filter out the product to delete
        const initialLength = wishlist.products.length;
        wishlist.products = wishlist.products.filter(
            (item) => item.productId.toString() !== productId
        );

        // If no product was removed
        if (wishlist.products.length === initialLength) {
            return res.status(400).json({
                success: false,
                message: "Product not found in wishlist.",
            });
        }

        // Save the updated wishlist
        await wishlist.save();

        return res.json({
            success: true,
            message: "Product removed from wishlist successfully.",
        });
    } catch (error) {
        console.error("Error deleting product from wishlist:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again.",
        });
    }
}


module.exports = {
    loadWishlist,
    addWishlist,
    wishCart,
    deleteWish,
}