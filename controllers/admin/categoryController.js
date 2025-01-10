const Category = require('../../models/categoryModel');
const Products = require('../../models/productModel');

const loadCategoryManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        // Calculate how many items to skip
        const skip = (page - 1) * limit;

        const categories = await Category.find({ isDeleted: false })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments({ isDeleted: false });

        const totalPages = Math.ceil(totalCategories / limit);

        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Products.countDocuments({ category: category._id });
                return {
                    ...category.toObject(),
                    productCount: productCount
                };
            })
        );

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



const loadAddCategoryPage = async (req, res) => {
    try {
        return res.status(200).render('admin/categoryAdd', { admin: req.session.admin });
    } catch (error) {
        console.error('Error loading add category page:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

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

        const products = await Products.find({ category: categoryId });

        for (const product of products) {
            const newOfferPrice = product.price - (product.price * offerPercentage) / 100;
            if (!product.offerPrice || newOfferPrice < product.offerPrice) {
                product.prevOfferPrice = product.offerPrice || null;
                product.offerPrice = newOfferPrice;
                await product.save();
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
        const products = await Products.find({ category: categoryId });

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

const searchCategories = async (req, res) => {
    try {
        const searchTerm = req.query.term;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        let query = {};

        if (searchTerm) {
            query = {
                name: { $regex: searchTerm, $options: 'i' },
                isDeleted: false
            };
        } else {
            query = { isDeleted: false };
        }

        // Get total count for pagination
        const totalCount = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        const categories = await Category.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'products'
                }
            },
            {
                $addFields: {
                    productCount: { $size: '$products' },
                    offerApplied: { $toBool: '$offer' }
                }
            },
            {
                $project: {
                    products: 0
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]);

        res.json({
            success: true,
            categories: categories,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalCount,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while searching categories',
            error: error.message
        });
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
    removeOffer,
    searchCategories
};
