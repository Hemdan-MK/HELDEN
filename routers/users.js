const express = require('express')
const router = express.Router();
const userController = require('../controllers/userController.js')
const passport = require('passport');
const accountController = require('../controllers/user/accountController.js')
const nocache = require('nocache');
const checkUserStatus = require('../middleware/userStatus.js'); 


router.get('/home', userController.loadMain);
router.get('/shop', userController.loadShop);
router.get('/about', userController.loadAbout);
router.get('/contact',userController.loadContact);
router.get('/register', userController.loadRegister);
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);



router.get('/auth/google',passport.authenticate('google',{scope: ['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req, res) => 
    {
        req.session.user = {
            email: req.user.email,
            name: req.user.name,
            id: req.user._id,
        };
        return res.redirect('/home');
    }
)


// router.use(checkUserStatus); 



router.get('/myAccount',checkUserStatus, userController.loadDash);
router.get('/myAccount/dash',checkUserStatus, userController.loadDashExtra);
router.get('/myAccount/orders',checkUserStatus, userController.loadOrders);
router.get('/myAccount/update-profile', checkUserStatus,userController.loadUpdateProfile);
router.get('/myAccount/my-address', checkUserStatus,userController.loadMyAddress);
router.get('/myAccount/change-password', checkUserStatus,userController.loadChangePassword);
router.get('/myAccount/wallet', checkUserStatus,userController.loadWallet);
router.get('/logout', userController.logout);
router.get('/otp', userController.loadLogin);
router.get('/register/loadOtp', userController.loadOTP);


router.post('/register/resendOtp', userController.resendOTP);
router.post('/register/verifyOtp', userController.verifyOTP);
router.post('/register/check-user', userController.checkuser);


router.get('/shop/product-detail/:id', checkUserStatus,userController.getProductDetail);


router.get('/forgot-password',accountController.forgotPassword);
router.post('/forgot-password/request',accountController.ForgetPassRequest);
router.post('/forgot-password/verify',accountController.ForgetPassverify);
router.put('/forgot-password/change-password',accountController.ForgetPassChange);
router.post('/forgot-password/resendOtp',accountController.resendOTP);



module.exports = router