const Order = require('../../models/orderModel')
const User = require('../../models/userRegister')

const loadOrderManagement = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name') // Assuming the user schema has a "username" field
            .populate('orderItems.productId', '_id totalAmount ');
        res.render('admin/orderManagement', { orders });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching orders.");
    }
}


const getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name')
            .populate('orderItems.productId', 'name totalAmount images');
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
        const order = await Order.findById(req.params.id);

        if (order) {
            order.status = shippingStatus;
            if (order.paymentMethod !== 'COD') {
                order.paymentStatus = paymentStatus;
            }
            await order.save();
            res.json({ message: 'Order status updated successfully' });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error updating order status' });
    }
};

// Cancel order
const cancel = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            order.status = 'Cancelled';
            await order.save();
            res.json({ message: 'Order has been cancelled' });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error cancelling the order' });
    }
};


module.exports = {
    loadOrderManagement,
    statusupdate,
    cancel,
    getOrder,
}