const Order = require('../../models/orderModel')
const User = require('../../models/userRegister')
const Cart = require('../../models/cartModel')
const Coupon = require('../../models/coupenModel')
const { instance } = require('../../utils/razorPay');
const crypto = require('crypto'); // Import crypto for signature verification
const Wallet = require('../../models/walletModel')


const checkout = async (req, res) => {
    try {
        // Fetch the user ID from the session
        const userId = req.session.user.id;

        // Fetch the latest order of the user
        const order = await Order.findOne({
            userId,
        })
            .populate('userId')
            .populate("orderItems.productId") // Populate product details
            .sort({ createdAt: -1 }); // Fetch the most recent order


        const coupons = await Coupon.find();


        // If no order is found
        if (!order || !order.orderItems || order.orderItems.length === 0) {
            return res.render("user/checkout", {
                coupons: null,
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
            coupons,
            order,
            subtotal,
            shipping,
            totalAmount,
            offerTotal,
            mrp,
            user: req.session.user,
            address: order.userId.address,
            estimatedDeliveryDate: estimatedDeliveryDate.toDateString(),
        });

    } catch (error) {
        console.error("Error in checkout controller:", error);
        return res.status(500).send("Internal Server Error");
    }
};


const done = async (req, res) => {

    const { userId, addressId, paymentMethod, razorpayPaymentId, totalAmount, appliedCoupon } = req.body;

    // Validate required fields
    if (!userId || !addressId || !paymentMethod || !totalAmount) {
        return res.status(400).json({
            success: false,
            message: "Required fields are missing: userId, addressId, or paymentMethod."
        });
    }

    const orderId = req.session.orderId;

    try {
        // Find the user and verify
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Find the address in the user's address array
        const address = user.address.id(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        // Find the existing order for the user
        let order = await Order.findOne({ _id: orderId }).populate('coupon');
        console.log('order  ->  : ' + order);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "No existing order found for this user."
            });
        }

        const coupon = await Coupon.findOne({
            couponCode: appliedCoupon,
            status: true,
            validFrom: { $lte: new Date() },
            validUpto: { $gte: new Date() },
            // isDeleted: false
        });

        console.log('coupen : ' + coupon);

        // Update order details
        order.addressId = address._id;
        order.paymentMethod = paymentMethod;
        order.status = paymentMethod === "Cash on Delivery" ? "Pending" : "Shipping"; // Update based on method

        // For Razorpay, check if Razorpay Payment ID is provided
        if (paymentMethod === "Net Banking") {
            if (!razorpayPaymentId) {
                return res.status(400).json({
                    success: false,
                    message: "Razorpay Payment ID is required for online payments."
                });
            }
            order.paymentStatus = "Completed";
            order.razorpayPaymentId = razorpayPaymentId;
        } else if (paymentMethod === "Cash on Delivery") {
            order.paymentStatus = "Pending";
        }

        order.totalAmount = totalAmount;

        console.log('coupon : ' + coupon);

        if (coupon) {
            order.coupon = coupon._id;
            // Update coupon count
            coupon.couponCount = coupon.couponCount - 1;
            await coupon.save()
        }

        // Remove any expiry
        order.expiresAt = undefined;
        console.log(coupon);
        delete req.session.checkProductStatus

        // Save the updated order
        const updatedOrder = await order.save();

        // Clear the user's cart
        await Cart.deleteOne({ userId });


        return res.status(200).json({
            success: true,
            message: "Order updated successfully.",
            paymentMethod: paymentMethod,
            order: updatedOrder
        });
    } catch (error) {
        console.error("Error while updating order:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};


const coupen = async (req, res) => {

    try {
        const { couponCode } = req.body;
        const coupon = await Coupon.findOne({
            couponCode: couponCode,
            status: true,
            validFrom: { $lte: new Date() },
            validUpto: { $gte: new Date() },
            couponCount: { $gt: 0 }
        });

        if (!coupon) {
            return res.json({ valid: false, message: 'Invalid or expired coupon.' });
        }

        res.json({ valid: true, coupon });
    } catch (error) {
        console.error('Coupon Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const razerpay = async (req, res) => {
    const { amount } = req.body;
    const Razorpay = require('razorpay');

    const razorpayInstance = new Razorpay({
        key_id: 'rzp_test_W9utN834UAJerT',
        key_secret: 'OFiG9mM7gu0gFkltYvq2iSkl'
    });

    const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: "order_rcptid_" + Date.now(),
    };

    try {
        const response = await razorpayInstance.orders.create(options);
        res.json({
            razorpayKey: "rzp_test_W9utN834UAJerT",
            orderId: response.id
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Razorpay order creation failed");
    }
}


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
        const wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
            const newWallet = new Wallet({
                userId: order.userId,
                balance: 0, // Initialize with a default balance
                transactions: [], // Initialize with an empty transactions array
            });

            await newWallet.save(); // Save the new wallet to the database
            wallet = newWallet;
            console.log("New wallet created for user:", order.userId);
        }
        if (order.status === 'Pending' || order.status === 'Shipping') {
            order.status = 'Cancelled';
            if (order.paymentMethod === 'Net Banking' && order.paymentStatus === 'Completed') {
                wallet.balance += order.totalAmount;
                wallet.transactions.push({
                    amount: order.totalAmount,
                    type: 'Credit',
                    description: 'Returning Order ' + order.id
                });
                await wallet.save();
            }
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


const returnOrder = async (req, res) => {
    const { id } = req.params; // Order ID
    const { reason } = req.body; // Return reason from the modal form

    try {
        // Update the order status to "Requested" and save the return reason
        await Order.findByIdAndUpdate(id, {
            status: 'Requested',
            refundReason: reason
        });

        console.log('Reason : ' + reason);


        res.status(200).json({ message: "Return request submitted successfully!" });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Failed to submit return request" });
    }
};


const success = async (req, res) => {
    const orderId = req.session.orderId;
    res.render('user/successPage', { orderId })
}


module.exports = {
    checkout,
    done,
    viewOrder,
    cancelOrder,
    success,
    coupen,
    razerpay,
    returnOrder
}
