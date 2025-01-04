const cartModel = require('../models/cartModel');
const wishlistModel = require('../models/wishlistModel');
// const notifyModel = require('../models/notificationModel');
const countCheck = async (req, res, next) => {
    try {
        if (req.session.user) {
            const cart = await cartModel.findOne({ userId: req.session.user.id });
            res.locals.cartCount = cart?.items?.length || 0; 

            return next();
        } else {
            res.locals.cartCount = 0;
        }
        return next();
    } catch (err) {
        console.error("Error in countCheck middleware:", err);
        return next(err); 
    }
};

module.exports = countCheck;
