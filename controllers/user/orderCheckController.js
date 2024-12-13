const Order = require('../../models/orderModel')
const User = require('../../models/userRegister')
const Cart = require('../../models/cartModel')


const checkout = async (req, res) => {
    try {
        // Fetch the user ID from the session
        const userId = req.session.user.id;

        // Fetch the latest order of the user
        const order = await Order.findOne({ userId })
            .populate('userId')
            .populate("orderItems.productId") // Populate product details
            .sort({ createdAt: -1 }); // Fetch the most recent order

        // If no order is found
        if (!order || !order.orderItems || order.orderItems.length === 0) {
            return res.render("user/checkout", {
                order: null,
                subtotal: 0,
                shipping: 0,
                totalAmount: 0,
                offerTotal: 0,
                mrp: 0,
                user: req.session.user
            });
        }

        // Initialize variables
        let subtotal = 0; // Sum of offer prices
        let mrp = 0; // Sum of original prices

        // Calculate totals
        order.orderItems.forEach((item) => {
            const product = item.productId;
            if (product) {
                subtotal += (product.offerPrice || product.price) * item.quantity;
                mrp += product.price * item.quantity;
            }
        });

        let condition = false;

        // Check if any product supports Cash on Delivery
        order.orderItems.forEach((item) => {
            if (item.productId && item.productId.cashOnDelivery) {
                condition = true; // Set condition to true if cashOnDelivery is true
            }
        });


        console.log('con : ' + condition);


        // Calculate discount
        const offerTotal = mrp - subtotal;

        // Calculate shipping charges based on subtotal
        let shipping = 0;
        if (subtotal > 0 && subtotal <= 1000) {
            shipping = 200;
        } else if (subtotal > 1000 && subtotal <= 5000) {
            shipping = 150;
        } else if (subtotal > 5000 && subtotal <= 10000) {
            shipping = 100;
        }

        // Calculate total amount including shipping
        const totalAmount = subtotal + shipping;
        console.log("add :  " + order.userId);

        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5); // Add 5 days

        // Render the checkout page with the calculated values
        return res.render("user/checkout", {
            order,
            subtotal,
            shipping,
            totalAmount,
            offerTotal,
            mrp,
            user: req.session.user,
            address: order.userId.address,
            estimatedDeliveryDate: estimatedDeliveryDate.toDateString(),
            condition
        });

    } catch (error) {
        console.error("Error in checkout controller:", error);
        return res.status(500).send("Internal Server Error");
    }
};


const done = async (req, res) => {
    const { userId, addressId, paymentMethod } = req.body;

    if (!userId || !addressId) {
        return res.status(400).json({
            success: false,
            message: "Required fields are missing: userId or addressId."
        });
    }

    try {
        // Find the user to verify and get the address
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const address = user.address.id(addressId); // Find the specific address
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        // Find the existing order for the user
        const order = await Order.findOne({ userId: userId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "No existing order found for this user."
            });
        }
        console.log(paymentMethod);

        // Update the addressId in the order schema
        order.addressId = address._id;
        order.paymentMethod = paymentMethod.toString();
        order.status = 'Shipping';

        if (paymentMethod.toString() === "Net Banking") {
            order.paymentStatus = "Completed";
        }

        order.expiresAt = undefined; // Explicitly remove expiresAt

        // Save the updated order
        const updatedOrder = await order.save();

        

        const cart = await Cart.findOne({ userId })
        // Clear the cart after successful order placement
        cart.items = [];
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Address updated successfully in the order.",
            order: updatedOrder
        });
    } catch (error) {
        console.error("Error while updating order address:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};


const viewOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('orderItems.productId');
        res.json(order); // Send order data for modal
    } catch (error) {
        console.error(error);
        res.status(500).send('Error viewing order');
    }
}


const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId);

        if (order.status === 'Pending') {
            order.status = 'Cancelled';
            await order.save();
            res.json({ message: 'Order cancelled successfully' });
        } else {
            res.status(400).json({ message: 'Order cannot be cancelled' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error cancelling order');
    }
}

const success = async (req, res) => {
    res.render('user/successPage' )
}


module.exports = {
    checkout,
    done,
    viewOrder,
    cancelOrder,
    success
}
