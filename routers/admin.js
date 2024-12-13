const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin/adminController.js')
const categoryController = require('../controllers/admin/categoryController.js')
const productController = require('../controllers/admin/productController.js')
const userController = require('../controllers/admin/userManagement.js')
const ordersController = require('../controllers/admin/orderController.js')
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




module.exports = router