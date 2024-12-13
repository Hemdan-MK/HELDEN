const Order = require('../../models/orderModel')

const loadProfile = async (req, res) => {
    const { email } = req.session.userData
    console.log(email);

    const user = await User.findOne({ email: email })
    try {
        res.render('user/profile', { user: user })

    } catch (error) {
        console.error("Error loading profile page :", error)
        res.status(500).send("Error loading profile page. Please try again.")

    }
}

const loadOrders = async (req, res) => {
    const orders = await Order.find()

    try {
        res.render('user/orders', { orders: orders })
    } catch (error) {
        console.error("Error loading orders page :", error)
        res.status(500).send("Error loading orders page. Please try again.")

    }
}

const viewOrder = async (req, res) => {
    const orderId = req.params.orderId;
    try {
        const order = await Order.findById(orderId).populate('orderItems.productId').populate('userId').populate('addressId')
        if (!order) {
            return res.status(404).send('Order not found. Please try again')
        }
        res.render('user/orderview', { order: order })
    } catch (error) {
        console.error("Error loading order view page :", error)
        res.status(500).send("Error loading order view page. Please try again.")

    }
}

const cancelOrder = async (req, res) => {
    const orderId = req.params.orderId;
    try {
        const order = await Order.findByIdAndUpdate(orderId, { status: 'cancelled' }, { new: true });

        if (!order) {
            return res.status(404).send('Order not found. Please try again')
        }
        res.redirect('/orders?cancelled=true')
    } catch (error) {
        console.error("Error cancelling order :", error)
        res.status(500).send("Error cancelling order. Please try again.")
    }
}



const loadUpdateProfile = async (req, res) => {
    try {
        res.render('user/updateProfile')
    } catch (error) {
        console.error("Error loading update profile page :", error)
        res.status(500).send("Error loading update profile page. Please try again.")

    }
}

const loadWallet = async (req, res) => {
    try {
        res.render('user/wallet')
    } catch (error) {
        console.error("Error loading wallet page :", error)
        res.status(500).send("Error loading wallet page. Please try again.")

    }
}