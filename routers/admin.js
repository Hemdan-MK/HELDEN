const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin/adminController.js')
const categoryController = require('../controllers/admin/categoryController.js')
const productController = require('../controllers/admin/productController.js')
const userController = require('../controllers/admin/userManagement.js')
const ordersController = require('../controllers/admin/orderController.js')
const couponController = require('../controllers/admin/couponController.js')
const offerController = require('../controllers/admin/offerController.js')
const upload = require('../utils/productMulter.js')
const upload_2 = require('../utils/categoryMulter.js')




// Middleware to check if user is authenticated
const { isAuthenticatedAdmin } = require('../middleware/adminAuth.js');

// Admin authentication routes
router.get('/login', adminController.getLoginPage); 
router.post('/login', adminController.postLogin);  

// Use the middleware for all routes that need admin authentication
router.use(isAuthenticatedAdmin); 

// Admin dashboard route (protected)
router.get('/dashboard',adminController.getDashboard);
router.get('/get-sales-data',adminController.getSalesData);
router.get('/custom-sales-data',adminController.getCustomSalesData);
router.get('/pdf',adminController.pdf);
router.get('/excel',adminController.excel);
router.post("/modal/filter", adminController.modalFilter);
router.get("/modal/pdf", adminController.modalPdf);
router.get("/modal/excel", adminController.modalExcel);


// Admin logout route
router.get('/logout', adminController.logoutAdmin); // POST: Handle Logout

// User management routes
router.get('/userManagement', userController.loadUserManagement)
router.put('/userManagement/ban', userController.userBan)
router.get('/userManagement/view', userController.viewUserDetails);


// Category management routes (issue with soft delete)
router.get('/categoryManagement', categoryController.loadCategoryManagement);
router.get('/categoryManagement/update/:id', categoryController.loadUpdateCategory);
router.put('/categoryManagement/update', upload_2.single('categoryImage'),categoryController.updateCategory);
router.put('/categoryManagement/unlink', categoryController.deleteCategory);
router.get('/categoryManagement/add', categoryController.loadAddCategoryPage);
router.post('/categoryManagement/add',upload_2.single('categoryImage'),categoryController.postAddCategoryPage);
router.get('/categoryManagement/del', categoryController.loadDelCategoryPage);
router.patch("/categoryManagement/recoverCategory/:id", categoryController.recoverCategory);
router.delete("/categoryManagement/permanentDeleteCategory/:id", categoryController.permanentDeleteCategory);
router.post("/categoryManagement/offers/add", categoryController.addOffer);
router.delete("/categoryManagement/offers/delete", categoryController.removeOffer);


// Product management routes
router.get('/productManagement', productController.loadProductManagement);
router.get('/productManagement/update/:id', productController.loadUpdateProduct);
router.put('/productManagement/update', (req, res, next) => {
    console.log(req.body);  // Check if any unexpected fields are being sent
    console.log(req.files); // Check the uploaded files
    next();
}, upload.fields([
    { name: 'productImage1', maxCount: 1 },
    { name: 'productImage2', maxCount: 1 },
    { name: 'productImage3', maxCount: 1 },
    { name: 'productImage4', maxCount: 1 }
]), productController.updateProduct);
router.put('/productManagement/unlink', productController.deleteProduct);
router.get('/productManagement/add', productController.loadAddProductsPage);
router.get('/productManagement/deleted', productController.loadDelProductPage);
router.post('/productManagement/add',
    upload.fields([
    { name: 'productImage1', maxCount: 1 },
    { name: 'productImage2', maxCount: 1 },
    { name: 'productImage3', maxCount: 1 },
    { name: 'productImage4', maxCount: 1 }
    ]),
    productController.postAddProductsPage);
router.patch("/productManagement/recoverProducts/:id", productController.recoverProducts);
router.delete("/productManagement/permanentDeleteProducts/:id", productController.permanentDeleteProducts);


// Order Management Routes
router.get('/orderManagement', ordersController.loadOrderManagement)
router.get('/orderManagement/getOrderDetails/:id', ordersController.getOrder)
router.post('/orderManagement/updateOrderStatus/:id', ordersController.statusupdate)
router.post('/orderManagement/cancelOrder/:id', ordersController.cancel)
router.post('/orderManagement/acceptReason/:id', ordersController.accept)
router.post('/orderManagement/rejectReason/:id', ordersController.reject)



// Coupon Management Routes
router.get('/couponManagement', couponController.loadCoupon)
router.post('/couponManagement', couponController.coupon)
router.get('/couponManagement/:id', couponController.modal)
router.post('/couponManagement/add', couponController.addCoupon)
router.put('/couponManagement/edit/:id', couponController.updateCoupon)
router.delete('/couponManagement/delete/:id', couponController.deleteCoupon)



router.get('/offerManagement', offerController.loadOffer)
router.get('/offerManagement/getCategories', offerController.getCategory)
router.get('/offerManagement/getProducts', offerController.getProducts)
router.post("/offerManagement/create", offerController.createOffer); // Add a new offer
router.get("/offerManagement/get", offerController.getOffers); // Get all offers
router.get("/offerManagement/getOffer/:id", offerController.specific); // Get all offers
router.put("/offerManagement/update/:id", offerController.updateOffer); // Update an offer by ID
router.delete("/offerManagement/delete/:id", offerController.deleteOffer); // Delete an offer by ID

module.exports = router