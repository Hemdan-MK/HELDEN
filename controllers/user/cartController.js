const Cart = require('../../models/cartModel')
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel')


const cartBadge = async (req, res) => {
    if (req.session.user) {
        const userId = req.session.user.id
        const cart = await Cart.findOne({ userId }) // Assuming cart is stored in session
        res.json({ itemCount: cart.items.length }); // Send the count of items in the cart
    } else {
        res.json({ itemCount: 0 }); // No user logged in, return 0 items
    }
}


const loadCart = async (req, res) => {
    try {
        const userId = req.session.user.id; // Assuming user ID is in the session
        const page = parseInt(req.query.page) || 1; // Get page number from query, default to 1
        const limit = 3; // Items per page
        const offset = (page - 1) * limit;

        const cart = await Cart.findOne({ userId }).populate('items.productId'); // Populate product details

        if (!cart || !Array.isArray(cart.items)) {
            return res.render('user/cart', {
                cart: null,
                subtotal: 0,
                shipping: 0,
                Total: 0,
                user: req.session.user,
                currentPage: page,
                totalPages: 1,
                mrp: 0,
                offerTotal: 0,

            });
        }

        // Calculate pagination
        const totalItems = cart.items.length;
        const totalPages = Math.ceil(totalItems / limit);

        // Paginate items
        const paginatedItems = cart.items.slice(offset, offset + limit);

        // Calculate prices
        let total = 0;
        let mrp = 0;
        paginatedItems.forEach(item => {
            total += item.productId.offerPrice * item.quantity;
            mrp += item.productId.price * item.quantity;
        });

        let offerTotal = mrp - total;
        let subtotal = 0;
        paginatedItems.forEach(item => {
            subtotal += item.productId.offerPrice * item.quantity;
        });

        let shipping = 0;
        if (subtotal > 0 && subtotal <= 1000) {
            shipping = 200;
        } else if (subtotal >= 1001 && subtotal <= 5000) {
            shipping = 150;
        } else if (subtotal >= 5001 && subtotal <= 10000) {
            shipping = 100;
        }

        let Total = subtotal + shipping;

        // Render cart with paginated items
        res.render('user/cart', {
            cart: { items: paginatedItems },
            subtotal,
            shipping,
            Total,
            user: req.session.user,
            offerTotal,
            mrp,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error loading cart:', error);
        res.status(500).json({ success: false, message: 'Something went wrong while loading the cart', error: error.message });
    }
};




// const addToCart = async (req, res) => {
//     const productId = req.params.id
//     const { quantity } = req.body;
//     const userId = req.session.userData.id

//     try {
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found" });
//         }

//         if (product.stock < quantity) {
//             return res.status(400).json({ success: false, message: "Insufficient stock" })
//         }



//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             cart = new Cart({ userId, items: [] });
//         }

//         const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
//         if (itemIndex >= 0) {
//             cart.items[itemIndex].quantity += Number(quantity);
//         } else {
//             cart.items.push({
//                 productId: productId,
//                 quantity: quantity
//             })
//         }

//         await cart.save();

//         product.stock -= parseInt(quantity, 10)
//         await product.save();


//         res.status(200).json({ success: true, message: "Product added to cart successfully" })

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: "Something went wrong while adding to cart" })
//     }
// }


const removeItem = async (req, res) => {
    try {
        const { itemId } = req.body; // Get itemId from the request body
        console.log('Item ID : ' + itemId);

        // Assuming the cart is stored under the user's session or userId
        const userId = req.user.id; // Get userId from session or JWT token
        console.log('userID :' + userId);

        // Find the cart for the user and remove the item
        const cart = await Cart.findOne({ userId });
        console.log('Cart :' + cart);

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Remove the item by its productId
        cart.items = cart.items.filter(item => item.id.toString() !== itemId)
        console.log('Cart updated :' + cart.items);

        // Save the updated cart
        await cart.save();

        return res.json({ message: 'Item removed successfully', cart });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const updateQuantity = async (req, res) => {
    try {
        const { itemId, quantity } = req.body; // Get itemId and quantity from the request body

        // Assuming the cart is stored under the user's session or userId
        const userId = req.user.id; // Get userId from session or JWT token

        // Find the cart for the user
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Find the item in the cart and update its quantity
        const item = cart.items.find(item => item.id.toString() === itemId);

        if (!item) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        // Update the item's quantity
        item.quantity = quantity;

        // Save the updated cart
        await cart.save();

        return res.json({ message: 'Quantity updated successfully', cart });
    } catch (error) {
        console.error('Error updating item quantity in cart:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};



const loadOrderSummary = async (req, res) => {
    try {
        const userId = req.session.user.id; // Assuming user ID is in the session
        const cart = await Cart.findOne({ userId }).populate('items.productId'); // Populate product details

        if (!cart || !Array.isArray(cart.items)) {
            return res.status(200).json({
                success: true,
                orderSummary: {
                    total: 0,
                    subtotal: 0,
                    shipping: 0,
                    offerTotal: 0,
                    Total: 0
                }
            });
        }

        const items = cart.items;

        // Calculate totals and shipping costs
        let total = 0;
        let mrp = 0; // For Offered Price
        let subtotal = 0;
        let shipping = 0;
        const updatedItems = [];

        for (const item of cart.items) {
            const product = item.productId;

            // Check stock and user quantity limits
            const maxAllowedQuantity = Math.min(5, product.stock); // Maximum of 5 or available stock
            if (item.quantity > maxAllowedQuantity) {
                item.quantity = maxAllowedQuantity; // Enforce stock/user limit
                await Cart.updateOne(
                    { userId, "items.productId": product._id },
                    { $set: { "items.$.quantity": maxAllowedQuantity } }
                );
            }

            const itemTotal = product.offerPrice * item.quantity;
            const itemMRP = product.price * item.quantity;

            subtotal += itemTotal;
            total += itemTotal;
            mrp += itemMRP;

            updatedItems.push({
                name: product.name,
                quantity: item.quantity,
                price: product.offerPrice,
                total: itemTotal,
                stock: product.stock,
            });
        }

        const offerTotal = mrp - total;

        if (subtotal > 0 && subtotal <= 1000) {
            shipping = 200;
        } else if (subtotal >= 1001 && subtotal <= 5000) {
            shipping = 150;
        } else if (subtotal >= 5001 && subtotal <= 10000) {
            shipping = 100;
        } else {
            shipping = 0;
        }

        const Total = subtotal + shipping;


        // Return order summary data as JSON for dynamic frontend updates
        res.status(200).json({
            success: true,
            orderSummary: {
                subtotal,
                shipping,
                offerTotal,
                Total,
                mrp,

            },
            items: updatedItems, // Provide updated items for the frontend
        });
    } catch (error) {
        console.error('Error loading order summary:', error); // Log the full error
        res.status(500).json({
            success: false,
            message: 'Something went wrong while loading the order summary',
            error: error.message
        });
    }
};


const getStock = async (req, res) => {
    try {
        const { itemId } = req.body; // Assuming itemId is the _id of the item in the cart

        console.log("Received itemId:", itemId);

        // Find the cart where the item with the given itemId exists in the items array
        const cart = await Cart.findOne({ "items._id": itemId });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart or item not found.' });
        }

        // Find the specific item in the cart's items array
        const cartItem = cart.items.find(item => item._id.toString() === itemId);

        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'Item not found in cart.' });
        }

        // Fetch the product using the productId from the cart item
        const product = await Product.findById(cartItem.productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        console.log("Product Stock:", product.stock);

        // Send the stock information
        res.status(200).json({ success: true, stock: product.stock });
    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).json({ success: false, message: 'Error fetching stock.', error: error.message });
    }
};



const orderPlace = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            console.log('no cart found');
            return res.status(200).json({ success: false, message: 'Your cart is empty. Add some Items to cart' });
        }

        // Format order items from cart
        const orderItems = cart.items.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.productId.offerPrice, // Assuming the price is stored in the Product model
        }));

        // Calculate total amount
        const subtotal = orderItems.reduce((total, item) => total + item.quantity * item.price, 0);

        let shipping = 0

        if (subtotal > 0 && subtotal <= 1000) {
            shipping = 200;
        } else if (subtotal >= 1001 && subtotal <= 5000) {
            shipping = 150;
        } else if (subtotal >= 5001 && subtotal <= 10000) {
            shipping = 100;
        } else {
            shipping = 0;
        }

        const Total = subtotal + shipping;

        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + 30);

        // Create a new order
        const order = new Order({
            userId: userId,
            totalAmount: Total,
            orderItems: orderItems,
            expiresAt: expiryTime // Set expiry time for automatic deletion

        });

        // Save the order
        const savedOrder = await order.save();

        req.session.mrp = Total

        req.session.orderId = savedOrder._id;
        if (shipping !== 0) {
            req.session.shipping = shipping;
        } else {
            req.session.shipping = 'Free Shipping';
        }


        console.log('----------------------------------------------------------------');
        console.log(req.session);

        return res.status(200).json({
            success: true,
            message: 'Order placed successfully.',
            orderId: savedOrder._id,
        });
    }
    catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Error placing order.', error: error.message });
    }
}


// const placeOrder = async (req, res) => {
//     const userId = req.session.userData.id
//     const { selectedAddress, paymentMethod, total, orderItems } = req.body;

//     try {
//         if (!selectedAddress || !paymentMethod) {
//             return res.status(400).json({ success: false, message: "Please select address and payment method" })
//         }
//         const address = await Address.findById(selectedAddress)

//         if (!address) {
//             return res.status(404).json({ success: false, message: "Selected address not found" })
//         }

//         if (paymentMethod !== 'COD') {
//             return res.status(400).json({ success: false, message: "Only COD payments are allowed" })
//         }

//         for (const item of orderItems) {
//             const product = await Product.findById(item.productId)

//             console.log(product.stock)



//             if (!product) {
//                 return res.status(404).json({ success: false, message: "Product not found" })
//             }
//             if (product.stock < item.quantity) {
//                 return res.status(400).json({ success: false, message: "Insufficient stock for products" })
//             }
//             product.stock -= item.quantity;
//             await product.save();
//         }

//         const newOrder = new Order({
//             userId: req.session.userData.id,
//             addressId: selectedAddress,
//             paymentMethod: paymentMethod,
//             totalAmount: total,
//             orderItems: orderItems,
//             paymentStatus: 'Pending',
//             status: 'Pending',
//         });

//         await newOrder.save();

//         await Cart.deleteOne({ userId });

//         res.status(200).json({ success: true, message: "Order placed successfully", order: newOrder })
//     } catch (error) {
//         console.error("Error placing order", error);
//         res.status(500).json({ success: false, message: "Something went Wrong" })
//     }
// }

module.exports = {
    cartBadge,
    loadCart,
    // addToCart,
    removeItem,
    updateQuantity,
    loadOrderSummary,
    // loadCheckout,
    // placeOrder,
    getStock,
    orderPlace
}