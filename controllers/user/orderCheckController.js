const Order = require('../../models/orderModel')
const User = require('../../models/userRegister')
const Cart = require('../../models/cartModel')
const Coupon = require('../../models/coupenModel')
const Wallet = require('../../models/walletModel');
const Products = require('../../models/productModel');
const Razorpay = require('razorpay');
const { instance } = require('../../utils/razorPay');


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

        // Find the existing order
        let order = await Order.findOne({ _id: orderId })
            .populate('coupon')
            .populate('orderItems.productId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "No existing order found for this user."
            });
        }

        // Check stock availability for all items before processing
        const stockCheck = await Promise.all(order.orderItems.map(async (item) => {
            const product = await Products.findById(item.productId);
            if (!product) {
                return {
                    success: false,
                    insuffStock : true,
                    message: `Product with ID ${item.productId} not found`
                };
            }

            const sizeStock = product.stockManagement.find(stock => stock.size === item.size);
            if (!sizeStock || sizeStock.quantity < item.quantity) {
                return {
                    success: false,
                    message: `Insufficient stock for product ${product.name} (Size: ${item.size})`
                };
            }

            return { success: true };
        }));

        // Check if any stock validation failed
        const stockError = stockCheck.find(check => !check.success);
        if (stockError) {
            return res.status(400).json({
                success: false,
                message: "Stock validation failed",
                error: stockError.message
            });
        }

        // Process coupon if applied
        const coupon = appliedCoupon ? await Coupon.findOne({
            couponCode: appliedCoupon,
            status: true,
            validFrom: { $lte: new Date() },
            validUpto: { $gte: new Date() },
        }) : null;

        // Update order details
        order.addressId = address._id;
        order.paymentMethod = paymentMethod;
        order.status = paymentMethod === "Cash on Delivery" ? "Pending" : "Shipping";

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

        if (coupon) {
            order.coupon = coupon._id;
            coupon.couponCount = coupon.couponCount - 1;
            await coupon.save();
        }

        // Remove expiry
        order.expiresAt = undefined;
        delete req.session.checkProductStatus;

        // Update product stock
        await Promise.all(order.orderItems.map(async (item) => {
            const product = await Products.findById(item.productId);
            product.stockManagement = product.stockManagement.map(stockItem => {
                if (stockItem.size === item.size) {
                    return { ...stockItem, quantity: stockItem.quantity - item.quantity };
                }
                return stockItem;
            });
            await product.save();
        }));

        // Save the order
        const updatedOrder = await order.save();

        // Clear the cart
        await Cart.deleteOne({ userId });

        return res.status(200).json({
            success: true,
            message: "Order placed successfully.",
            paymentMethod: paymentMethod,
            order: updatedOrder
        });

    } catch (error) {
        console.error("Error while processing order:", error);
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

const razorpay = async (req, res) => {
    const { amount } = req.body;

    const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: "order_rcptid_" + Date.now(),
    };

    try {
        const response = await instance.orders.create(options);
        res.json({
            razorpayKey: process.env.RAZORPAY_KEY,
            razorpayOrderId: response.id
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
        res.json(order); //
    } catch (error) {
        console.error(error);
        res.status(500).send('Error viewing order');
    }
}


const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log(orderId);
        
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ message: 'Cancellation reason is required' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
            const newWallet = new Wallet({
                userId: order.userId,
                balance: 0,
                transactions: [],
            });

            await newWallet.save();
            wallet = newWallet;
        }
        if (order.status === 'Pending' || order.status === 'Shipping') {
            // Update stock for each product in the order
            try {
                for (const item of order.orderItems) {
                    const product = await Products.findById(item.productId);
                    if (!product) {
                        console.error(`Product not found: ${item.productId}`);
                        continue;
                    }

                    // Find the stock entry for the specific size
                    const stockItem = product.stockManagement.find(
                        stock => stock.size === item.size
                    );

                    if (stockItem) {
                        stockItem.quantity += item.quantity;
                        await product.save();
                    } else {
                        console.error(`Size ${item.size} not found for product ${item.productId}`);
                    }
                }
            } catch (stockError) {
                console.error('Error updating stock:', stockError);
                return res.status(500).json({ message: 'Error updating product stock' });
            }

            // Update order status and reason
            order.status = 'Cancelled';
            order.reason = reason;

            // Handle refund for online payments
            if (order.paymentMethod === 'Net Banking' && order.paymentStatus === 'Completed') {
                wallet.balance += order.totalAmount;
                wallet.transactions.push({
                    amount: order.totalAmount,
                    type: 'Credit',
                    description: 'Cancelled Order ' + order.orderId // Changed from order.id to order.orderId
                });
                await wallet.save();
            }

            await order.save();
            res.json({
                message: 'Order cancelled successfully and stock updated',
                orderId: order.orderId,
                success: true,
            });
        } else {
            res.status(400).json({
                message: 'Order cannot be cancelled',
                currentStatus: order.status,
                success: false,
            });
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
            reason: reason
        });

        res.status(200).json({ message: "Return request submitted successfully!" });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Failed to submit return request" });
    }
};


const success = async (req, res) => {
    try {
        const orderId = req.session.orderId;
        const order = await Order.findById(orderId);
        
        res.render('user/successPage', { order , user : req.session.user})
    } catch (error) {
        console.error("Error order success :", error);
        res.status(500).json({ message: "Failed to load  success page" });
    }
}

const failed = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        // Update the order status in your database
        await Order.findByIdAndUpdate(orderId, { paymentStatus: status });

        res.status(200).json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
}

const retryPayment = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const options = {
            amount: order.totalAmount * 100, // Convert to paise
            currency: "INR",
            receipt: "order_rcptid_" + Date.now(),
        };

        const razorpayOrder = await instance.orders.create(options);

        res.json({
            success: true,
            razorpayKey: process.env.RAZORPAY_KEY,
            razorpayOrderId: razorpayOrder.id,
            amount: order.totalAmount,
        });
    } catch (error) {
        console.error("Error fetching order details for retry:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}


const confirmRetry = async (req, res) => {
    const { orderId, razorpayPaymentId } = req.body;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Update order payment status and Razorpay payment ID
        order.paymentStatus = "Completed";
        order.paymentMethod = "Net Banking";
        order.razorpayPaymentId = razorpayPaymentId;
        order.expiresAt = undefined;

        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error("Error confirming retry payment:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

module.exports = {
    checkout,
    done,
    viewOrder,
    cancelOrder,
    success,
    coupen,
    razorpay,
    returnOrder,
    failed,
    retryPayment,
    confirmRetry
}
