const Coupon = require('../../models/coupenModel')


const loadCoupon = async (req, res) => {
    try {
        res.render('admin/couponManagement')
    } catch (error) {

    }
}


// Fetch all coupons
const coupon = async (req, res) => {
    try {
        const coupons = await Coupon.find({}).sort({ createdAt: -1 });
        res.status(200).json(coupons);
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ message: 'Server Error. Unable to fetch coupons.' });
    }
};

// Fetch specific coupons
const modal = async (req, res) => {
    try {
        const { id } = req.params;
        const coupons = await Coupon.findById(id);
        res.status(200).json(coupons);
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ message: 'Server Error. Unable to fetch coupons.' });
    }
};

// Add a new coupon
const addCoupon = async (req, res) => {
    try {
        const {
            couponCode,
            validFrom,
            validUpto,
            discountPercentage,
            minPrice,
            maxDiscount,
            couponCount,
            status,
        } = req.body;

        // Validation
        if (!couponCode || !validFrom || !validUpto || !discountPercentage || !minPrice || !maxDiscount) {
            return res.status(400).json({ message: 'All required fields must be provided.' });
        }

        // Check for duplicate coupon code
        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists.' });
        }

        // Create new coupon
        const newCoupon = new Coupon({
            couponCode,
            validFrom,
            validUpto,
            discountPercentage,
            minPrice,
            maxDiscount,
            couponCount,
            status,
        });

        await newCoupon.save();
        res.status(201).json({ message: 'Coupon added successfully.' });
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ message: 'Server Error. Unable to add coupon.' });
    }
};

// Update a coupon
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            couponCode,
            validFrom,
            validUpto,
            discountPercentage,
            minPrice,
            maxDiscount,
            couponCount,
            status,
        } = req.body;

        // Find and update coupon
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            {
                couponCode,
                validFrom,
                validUpto,
                discountPercentage,
                minPrice,
                maxDiscount,
                couponCount,
                status,
                updatedAt: Date.now(),
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found.' });
        }

        res.status(200).json({ message: 'Coupon updated successfully.', coupon: updatedCoupon });
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ message: 'Server Error. Unable to update coupon.' });
    }
};

// Delete a coupon (soft delete)
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        await Coupon.findByIdAndDelete(id);

        res.status(200).json({ message: 'Coupon deleted successfully.' });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ message: 'Server Error. Unable to delete coupon.' });
    }
};

module.exports = {
    loadCoupon,
    coupon,
    modal,
    addCoupon,
    updateCoupon,
    deleteCoupon,
};