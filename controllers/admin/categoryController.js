const Category = require('../../models/categoryModel');
const Products = require('../../models/productModel');

// Load all categories (Category Management Page)
const loadCategoryManagement = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });
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
            categoriesWithCounts 
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

module.exports = {
    loadCategoryManagement,
    loadAddCategoryPage,
    postAddCategoryPage,
    loadUpdateCategory,
    updateCategory,
    deleteCategory,
    loadDelCategoryPage,
    recoverCategory,
    permanentDeleteCategory
};
