const Order = require('../../models/orderModel');
const productModel = require('../../models/productModel');
const User = require('../../models/userRegister')
const Wallet = require('../../models/walletModel')

const loadOrderManagement = async (req, res) => {
    try {
        // Default page number and limit for pagination
        const page = parseInt(req.query.page) || 1; // Page number, default 1
        const limit = 10; // Number of items per page, default 10
        const skip = (page - 1) * limit; // Calculate the number of documents to skip

        // Fetch total number of orders for pagination metadata
        const totalOrders = await Order.countDocuments();

        // Fetch paginated orders
        const orders = await Order.find({
            expiresAt: { $exists: false }
        })
            .sort({ createdAt: -1 })
            .populate('userId')
            .populate('orderItems.productId')
            .skip(skip)
            .limit(limit);

        // Calculate total pages
        const totalPages = Math.ceil(totalOrders / limit);

        // Render with pagination data
        res.render('admin/orderManagement', {
            orders,
            currentPage: page,
            totalPages,
            limit
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching orders.");
    }
};


const getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId')
            .populate('orderItems.productId');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching order details' });
    }
}

// Update order status (shipping and payment status)
const statusupdate = async (req, res) => {
    try {
        const { shippingStatus, paymentStatus } = req.body;
        const order = await Order.findOne({ orderId: req.params.id });       
        
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
        }

        if (shippingStatus === 'Cancelled') {
            
            if (order.paymentStatus === "Completed" && order.paymentMethod === "Net Banking") {
                // Add the order amount to the user's wallet balance

                const wallet = await Wallet.findOne({ userId: order.userId });
                if (!wallet) {
                    const newWallet = new Wallet({
                        userId: order.userId,
                        balance: 0, // Initialize with a default balance
                        transactions: [], // Initialize with an empty transactions array
                    });

                    newWallet.balance = order.totalAmount;
                    newWallet.transactions.push({
                        amount: order.totalAmount,
                        type: 'Credit',
                        description: 'Order cancelled by admin' + order.orderId
                    });

                    await newWallet.save(); // Save the new wallet to the database

                } else {
                    
                    wallet.balance += order.totalAmount;
                    wallet.transactions.push({
                        amount: order.totalAmount,
                        type: 'Credit',
                        description: 'Order cancelled by admin' + order.orderId
                    });

                    await wallet.save(); // Save the updated wallet to the database
                }


            }
        }
        order.status = shippingStatus;
        order.paymentStatus = paymentStatus;

        await order.save();
        res.json({ message: 'Order status updated successfully' });

    } catch (err) {
        res.status(500).json({ message: 'Error updating order status' });
    }
};

// Cancel order
const cancel = async (req, res) => {
    try {

        const order = await Order.findOne({ orderId: req.params.id });

        const wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
            const newWallet = new Wallet({
                userId: order.userId,
                balance: 0, // Initialize with a default balance
                transactions: [], // Initialize with an empty transactions array
            });

            await newWallet.save(); // Save the new wallet to the database
            wallet = newWallet;
        }

        if (order.status === 'Pending' || order.status === 'Shipping') {
            // Update stock for each product in the order
            for (const item of order.orderItems) {
                const product = await productModel.findById(item.productId);
                if (product) {
                    // Find the stock entry for the specific size
                    const stockEntry = product.stockManagement.find(
                        stock => stock.size === item.size
                    );

                    if (stockEntry) {
                        // Increase the quantity by the ordered amount
                        stockEntry.quantity += item.quantity;
                        await product.save();
                    }
                }
            }

            // Update order status
            order.status = 'Cancelled';

            // Handle refund if payment was completed through Net Banking
            if (order.paymentMethod === 'Net Banking' && order.paymentStatus === 'Completed') {
                wallet.balance += order.totalAmount;
                wallet.transactions.push({
                    amount: order.totalAmount,
                    type: 'Credit',
                    description: 'Cancelled Order ' + order.orderId
                });
                await wallet.save();
            }

            await order.save();
            res.json({
                message: 'Order cancelled successfully and stock updated',
                orderId: order.orderId
            });
        } else {
            res.status(400).json({
                message: 'Order cannot be cancelled',
                currentStatus: order.status
            });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error cancelling the order' });
    }
};


const accept = async (req, res) => {
    try {
        const id = req.params.id;

        const order = await Order.findOne({ orderId: id }).populate('userId');

        order.status = 'Returned';
        const wallet = await Wallet.findOne({ userId: order.userId._id }).populate('userId');

        if (wallet) {
            wallet.balance += order.totalAmount;
            wallet.transactions.push({
                amount: order.totalAmount,
                type: 'Credit',
                description: 'Returning Order ' + order.orderId
            });
            await wallet.save();
        } else {
            const newWallet = new Wallet({ userId: order.userId, balance: order.totalPrice });
            newWallet.balance += order.totalAmount;
            newWallet.transactions.push({
                amount: order.totalAmount,
                type: 'Credit',
                description: 'Returning Order ' + order.orderId
            });
            await newWallet.save();
        }

        await order.save();
        return res.json({ message: 'Order Returned Successfully' })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error Returning Order' });
    }
}

const reject = async (req, res) => {
    try {
        const id = req.params.id;

        const order = await Order.findOne({ orderId: id });

        order.status = 'Rejected';
        await order.save();
        return res.json({ message: 'Order Rejected Successfully' })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error Returning Order' });
    }
}
module.exports = {
    loadOrderManagement,
    statusupdate,
    cancel,
    getOrder,
    accept,
    reject,
}