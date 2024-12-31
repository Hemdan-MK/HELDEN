const Category = require('../../models/categoryModel');
const Products = require('../../models/productModel');

// Load all categories (Category Management Page)
const loadCategoryManagement = async (req, res) => {
    try {
        // Get page number and limit from query params, default to page 1 and limit 10
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        // Calculate how many items to skip
        const skip = (page - 1) * limit;

        // Get categories with pagination
        const categories = await Category.find({ isDeleted: false })
            .skip(skip)         // Skip the previous categories based on the page
            .limit(limit);      // Limit the number of categories per page

        // Get total count of categories to calculate total pages
        const totalCategories = await Category.countDocuments({ isDeleted: false });

        // Calculate total pages
        const totalPages = Math.ceil(totalCategories / limit);

        // Get product count for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Products.countDocuments({ category: category._id });
                return {
                    ...category.toObject(),
                    productCount: productCount
                };
            })
        );

        // Render the category management page with pagination data
        return res.status(200).render('admin/categoryManagement', {
            admin: req.session.admin,
            categoriesWithCounts,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            limit: limit
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};



// Load the Add Category Page
const loadAddCategoryPage = async (req, res) => {
    try {
        return res.status(200).render('admin/categoryAdd', { admin: req.session.admin });
    } catch (error) {
        console.error('Error loading add category page:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Add a new category
const postAddCategoryPage = async (req, res) => {
    try {
        const { categoryName, categoryDescription } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file was uploaded." });
        }

        const imagePath = req.file.path.split('public')[1];

        const newCategory = new Category({
            name: categoryName,
            description: categoryDescription,
            image: imagePath,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await newCategory.save();
        return res.status(201).json({ success: true, message: 'Category added successfully!', category: newCategory });
    } catch (error) {
        console.error('Error adding category:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Load Update Category Page
const loadUpdateCategory = async (req, res) => {
    const categoryId = req.params.id;
    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        return res.status(200).render('admin/categoryUpdate', {
            admin: req.session.admin,
            category
        });
    } catch (error) {
        console.error('Error loading category update page:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Update a category
const updateCategory = async (req, res) => {
    const { categoryId, categoryName, categoryDescription } = req.body;

    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category.name = categoryName;
        category.description = categoryDescription;

        if (req.file) {
            category.image = `/categoryUploads/${req.file.filename}`;
        }

        category.updatedAt = Date.now();
        await category.save();

        return res.status(200).json({ success: true, message: 'Category updated successfully!' });
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Delete a category (soft delete)
const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.body;

        const category = await Category.findByIdAndUpdate(
            categoryId,
            { isDeleted: true },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        return res.status(200).json({ success: true, message: 'Category deleted successfully!' });
    } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Load Deleted Categories (Deleted Categories Page)
const loadDelCategoryPage = async (req, res) => {
    try {
        const deletedCategories = await Category.find({ isDeleted: true });
        return res.status(200).render('admin/categoryDelete', {
            admin: req.session.admin,
            deletedCategories
        });
    } catch (error) {
        console.error('Error fetching deleted categories:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Recover a deleted category
const recoverCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await Category.findByIdAndUpdate(id, { isDeleted: false }, { new: true });
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        return res.status(200).json({ success: true, message: 'Category recovered successfully!' });
    } catch (error) {
        console.error('Error recovering category:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Permanently Delete a Category
const permanentDeleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        return res.status(200).json({ success: true, message: 'Category permanently deleted!' });
    } catch (error) {
        console.error('Error permanently deleting category:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
const addOffer = async (req, res) => {
    try {
        const { categoryId, offerPercentage } = req.body;

        if (!categoryId || !offerPercentage) {
            return res.status(400).json({ message: "Category ID and Offer Percentage are required." });
        }

        // Find products in the given category
        const products = await Products.find({ category : categoryId });

        console.log('hi');
        console.log('products : ');
        console.log(products);

        // Update the products' offerPrice
        for (const product of products) {
            console.log(`Processing product: ${product._id}`);
            const newOfferPrice = product.price - (product.price * offerPercentage) / 100;
            if (!product.offerPrice || newOfferPrice < product.offerPrice) {
                console.log(`Updating offer price for product: ${product._id}`);
                product.prevOfferPrice = product.offerPrice || null;
                product.offerPrice = newOfferPrice;
                await product.save();
                console.log(`Product saved: ${product._id}`);
            }
        }

        // Update the category's offer details
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        category.offer = offerPercentage;
        category.offerApplied = true;
        category.updatedAt = Date.now();
        await category.save();

        res.status(200).json({ message: "Offer prices updated successfully." });
    } catch (error) {
        console.error("Error updating offers:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};



const removeOffer = async (req, res) => {
    try {
        const { categoryId } = req.body;

        // Validate input
        if (!categoryId) {
            return res.status(400).json({ message: "Category ID is required." });
        }

        // Find products in the category
        const products = await Products.find({ category : categoryId });

        // Update each product's offerPrice and clear prevOfferPrice

        for (let product of products) {
            product.offerPrice = product.prevOfferPrice || product.offerPrice; // Revert to prevOfferPrice if it exists
            product.prevOfferPrice = null; // Clear prevOfferPrice
            await product.save(); // Save changes
        }

        const category = await Category.findById(categoryId);
        category.offer = null;
        category.offerApplied = false;
        category.updatedAt = Date.now();
        await category.save();

        res.status(200).json({ message: "Offers removed successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};


module.exports = {
    loadCategoryManagement,
    loadAddCategoryPage,
    postAddCategoryPage,
    loadUpdateCategory,
    updateCategory,
    deleteCategory,
    loadDelCategoryPage,
    recoverCategory,
    permanentDeleteCategory,
    addOffer,
    removeOffer
};
