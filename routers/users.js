const express = require('express')
const router = express.Router();
const userController = require('../controllers/userController.js')
const productDetailController = require('../controllers/user/productDetailController.js')
const passport = require('passport');
const accountController = require('../controllers/user/accountController.js')
const nocache = require('nocache');
const checkUserStatus = require('../middleware/userStatus.js');
const cartController = require('../controllers/user/cartController.js')
const addressController = require('../controllers/user/addressController.js')
const checkoutController = require('../controllers/user/orderCheckController.js')
const filterController = require('../controllers/user/filterController.js')
const wishlistController = require('../controllers/user/wishlistController.js')
const walletController = require('../controllers/user/walletController.js')
const downloadController= require('../controllers/user/downloadController.js')
const checkProductStatus = require('../middleware/checkProductStatus.js')
const checkBadge = require('../middleware/badgeCount.js');



router.use(checkBadge)

router.get('/home', userController.loadMain);
router.get('/shop', userController.loadShop);
router.get('/about', userController.loadAbout);
router.get('/contact', userController.loadContact);
router.get('/register', userController.loadRegister);
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);



router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/register' }), (req, res) => {
    req.session.user = {
        email: req.user.email,
        name: req.user.name,
        id: req.user._id,
    };
    return res.redirect('/home');
}
)




router.get('/myAccount', checkUserStatus, userController.loadDash);
router.get('/myAccount/orders', checkUserStatus, userController.loadOrders);
router.get('/myAccount/update-profile', checkUserStatus, userController.loadUpdateProfile);
router.post('/myAccount/update-profile', checkUserStatus, userController.updateProfile);
router.get('/myAccount/saved-address', checkUserStatus, userController.loadMyAddress);
router.get('/myAccount/change-password', checkUserStatus, userController.loadChangePassword);
router.get('/myAccount/wallet', checkUserStatus, userController.loadWallet);
router.get('/logout', userController.logout);
router.get('/otp', userController.loadLogin);
router.get('/register/loadOtp', userController.loadOTP);



router.post('/shop/filter', filterController.filter);
router.post('/shop/search', filterController.search);



router.post('/addAddress', checkUserStatus, addressController.addAddress);
router.put('/editAddress/:addressId', checkUserStatus, addressController.editAddress);
router.delete('/deleteAddress/:addressId', checkUserStatus, addressController.deleteAddress);



router.get('/wallet/:userId', checkUserStatus, walletController.wallet);



router.get('/order/:id', checkUserStatus, checkoutController.viewOrder);
router.post('/order/cancel/:id', checkUserStatus, checkoutController.cancelOrder);
router.post('/order/return/:id', checkUserStatus, checkoutController.returnOrder);

router.get('/checkout', checkUserStatus, checkoutController.checkout);
router.post('/checkout/done', checkUserStatus,checkProductStatus, checkoutController.done);
router.post('/razorpay/initiate', checkUserStatus, checkoutController.razerpay);
router.post('/coupon/validate', checkUserStatus, checkoutController.coupen);
router.get('/successPage',checkUserStatus,checkoutController.success);
router.post('/failed-order',checkUserStatus,checkoutController.failed);
router.get('/retry-payment/:orderId',checkUserStatus,checkoutController.retryPayment);
router.post('/confirm-retry',checkUserStatus,checkoutController.confirmRetry);




router.get('/wishlist', checkUserStatus, wishlistController.loadWishlist);
router.post('/add-to-wishlist', checkUserStatus, wishlistController.addWishlist);
router.post('/wish/cart/add', checkUserStatus, wishlistController.wishCart);
router.delete('/wishlist/delete', checkUserStatus, wishlistController.deleteWish);





router.post('/register/resendOtp', userController.resendOTP);
router.post('/register/verifyOtp', userController.verifyOTP);
router.post('/register/check-user', userController.checkuser);



router.get('/shop/product-detail/:id', productDetailController.getProductDetail);
router.post('/shop/product-detail/add-to-cart', checkUserStatus, productDetailController.addToCart);
router.post('/shop/product/stock', productDetailController.stock);



router.get('/cartBadge', cartController.cartBadge);
router.get('/cart', checkUserStatus, cartController.loadCart);
router.post('/cart/quantity', checkUserStatus, cartController.updateQuantity);
router.post('/cart/remove', checkUserStatus, cartController.removeItem);
router.get('/cart/summary', checkUserStatus, cartController.loadOrderSummary);
router.post('/cart/stock', checkUserStatus,cartController.getStock);
router.get('/cart/checkout', checkUserStatus, cartController.orderPlace);



router.get('/forgot-password', accountController.forgotPassword);
router.post('/forgot-password/request', accountController.ForgetPassRequest);
router.post('/forgot-password/verify', accountController.ForgetPassverify);
router.put('/forgot-password/change-password', accountController.ForgetPassChange);
router.post('/forgot-password/resendOtp', accountController.resendOTP);



router.get("/download-receipt",checkUserStatus,downloadController.download)
router.get('/download-invoice/:orderId',checkUserStatus,downloadController.frontDownload)



module.exports = router