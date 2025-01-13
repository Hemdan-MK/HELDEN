// P R O D U C T   M A N A G E M E N T
// -----------------------------------

const Products = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const path = require('path')
const fs = require('fs')


const loadProductManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        // Create search query
        const searchQuery = {
            isDeleted: false,
            $or: [
                { name: { $regex: search, $options: 'i' } },
                // Add more fields to search if needed
            ]
        };

        // Count total documents for pagination
        const totalProducts = await Products.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalProducts / limit);

        // Get products with pagination
        const products = await Products.find(searchQuery)
            .populate('category')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        if (!products || products.length === 0) {
            return res.status(200).render('admin/productManagement', {
                msg: 'No products found',
                products: [],
                currentPage: page,
                totalPages: totalPages,
                search: search
            });
        }

        return res.status(200).render('admin/productManagement', {
            products,
            currentPage: page,
            totalPages: totalPages,
            search: search
        });

    } catch (error) {
        console.log('Error in product management:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

const loadUpdateProduct = async (req, res) => {
    const productId = req.params.id;

    try {
        const product = await Products.findById(productId).populate('category');
        const categories = await Category.find();
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Render the update page with the product data
        return res.status(200).render('admin/productUpdate', { product, categories });
    } catch (error) {
        console.error('Error loading product update page:', error);
        return res.status(500).json({ message: 'Error loading product update page' });
    }
};

const updateProduct = async (req, res) => {

    const {
        productId,
        productName,
        productDescription,
        productPrice,
        productOfferPrice,
        productStockManagement,
        productTags,
        productBrand,
        productWarranty,
        productReturnPolicy,
        productCategory,
        productType,
    } = req.body;

    try {

        const product = await Products.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product.name = productName;
        product.description = productDescription;
        product.price = productPrice;
        product.offerPrice = productOfferPrice;
        product.tags = productTags ? productTags.split(",").map(tag => tag.trim()) : [];
        product.brand = productBrand;
        product.warranty = productWarranty;
        product.returnPolicy = productReturnPolicy;
        product.category = productCategory;
        product.productType = productType;
        product.updatedAt = Date.now();
        product.stockManagement = JSON.parse(productStockManagement);

        const imageFields = ['productImage1', 'productImage2', 'productImage3', 'productImage4'];
        imageFields.forEach((field, index) => {
            const file = req.files[field] ? req.files[field][0] : null; // Get the file for each field
            if (file) {
                // If there is an old image, delete it
                if (product.images[index]) {
                    const oldImagePath = product.images[index];
                    const absoluteOldImagePath = path.join(__dirname, '../../public', oldImagePath);

                    if (fs.existsSync(absoluteOldImagePath)) {
                        fs.unlinkSync(absoluteOldImagePath);
                    }
                }

                // Save new image URL
                product.images[index] = `/productUploads/${file.filename}`;
            }
        });

        await product.save();
        return res.status(200).json({ success: true, message: 'Successfully updated product' });
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ success: false, message: 'Error updating product' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.body;

        const product = await Products.findByIdAndUpdate(
            productId,
            { isDeleted: true }, // Mark as deleted (soft delete)
            { new: true } // Return the updated product
        );

        if (!product) {
            return res.status(404).send('Product not found');
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Error loading product update:', error);
        return res.status(500).json({ success: false });

    }
};

const loadAddProductsPage = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });
        return res.status(200).render('admin/productAdd', { categories: categories, });
    } catch (error) {
        console.error('Error loading product adding page:', error);
        return res.status(500).json({ message: 'Error loading product adding page' });
    }
};

const postAddProductsPage = async (req, res) => {
    try {
        const {
            productName,
            productDescription,
            productPrice,
            productOfferPrice,
            productStockManagement,
            productTags,
            productBrand,
            productWarranty,
            productReturnPolicy,
            productCategory,
            productType,
        } = req.body;


        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ val: false, msg: "No files were uploaded" });
        }

        const imagePaths = [];
        for (const key in req.files) {
            req.files[key].forEach((file) => {
                const relativePath = file.path.split('public')[1];
                imagePaths.push(relativePath);
            });
        }

        const newProduct = new Products({
            name: productName,
            description: productDescription,
            price: productPrice,
            offerPrice: productOfferPrice,
            images: imagePaths,
            productType: productType,
            stockManagement: JSON.parse(productStockManagement),
            tags: productTags ? productTags.split(",").map(tag => tag.trim()) : [],
            brand: productBrand,
            warranty: productWarranty,
            returnPolicy: productReturnPolicy,
            category: productCategory,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });


        await newProduct.save();
        return res.status(200).redirect('/admin/productManagement');
    } catch (error) {
        console.error('Error posting product:', error);
        return res.status(500).json({ message: 'Error posting product' });
    }
};

const loadDelProductPage = async (req, res) => {
    try {
        const deletedProducts = await Products.find({ isDeleted: true });
        return res.status(200).render("admin/productDelete", { deletedProducts });
    } catch (error) {
        console.error("Error fetching deleted products:", error);
        return res.status(500).send("Internal Server Error");
    }
};

const recoverProducts = async (req, res) => {
    const { id } = req.params;

    try {
        await Products.findByIdAndUpdate(id, { isDeleted: false });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error recovering product:", error);
        return res.status(500).send("Internal Server Error");
    }
};

// Function to permanently delete a product
const permanentDeleteProducts = async (req, res) => {
    const { id } = req.params;

    try {
        await Products.findByIdAndDelete(id);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error permanently deleting product:", error);
        return res.status(500).send("Internal Server Error");
    }
};

const searchProducts = async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const query = {
            isDeleted: false,
            name: { $regex: searchQuery, $options: 'i' }
        };

        const products = await Products.find(query)
            .populate('category')
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Products.countDocuments(query);

        res.json({
            success: true,
            data: products,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    loadProductManagement,
    loadUpdateProduct,
    updateProduct,
    deleteProduct,
    loadAddProductsPage,
    postAddProductsPage,
    loadDelProductPage,
    recoverProducts,
    permanentDeleteProducts,
    searchProducts
};
