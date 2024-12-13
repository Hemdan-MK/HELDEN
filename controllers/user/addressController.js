const User = require('../../models/userRegister');

// Add new address
const addAddress = async (req, res) => {
    try {
        const { houseName, country, state, city, district, pincode, street, houseNumber, landmark } = req.body;
        
        if (!houseName || !country || !state || !city || !district || !pincode) {
            return res.status(400).json({
                success: false,
                message: 'All address fields are required.'
            });
        }

        // Validate pincode format (example: 6 digit number for India)
        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pincode format.'
            });
        }

        // Check if the user is logged in
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'User not logged in!'
            });
        }

        const userId = req.session.user.id;

        // Find user and push new address to their address array
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found!'
            });
        }

        const newAddress = {
            houseName,
            country,
            state,
            city,
            district,
            pincode,
            landmark,
            houseNumber,
            street
        };

        user.address.push(newAddress);
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Address added successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add address. Please try again.'
        });
    }
};

// Edit existing address
const editAddress = async (req, res) => {
    try {
        const { addressId, houseName, country, state, city, district, pincode, street, houseNumber, landmark } = req.body;
        
        if (!houseName || !country || !state || !city || !district || !pincode) {
            return res.status(400).json({
                success: false,
                message: 'All address fields are required.'
            });
        }

        // Validate pincode format (example: 6 digit number for India)
        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pincode format.'
            });
        }

        const userId = req.session.user.id;

        // Find user and the address to be updated
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found!'
            });
        }

        const addressIndex = user.address.findIndex(address => address._id.toString() === addressId);

        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Address not found.'
            });
        }

        // Update the address
        user.address[addressIndex] = {
            // _id: addressId,
            houseName,
            country,
            state,
            city,
            district,
            pincode,
            landmark,
            houseNumber,
            street
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Address updated successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update address. Please try again.'
        });
    }
};

// Delete address
const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const userId = req.session.user.id;

        // Find user and address to be deleted
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found!'
            });
        }

        const addressIndex = user.address.findIndex(address => address._id.toString() === addressId);

        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Address not found.'
            });
        }

        // Remove the address from the array
        user.address.splice(addressIndex, 1);
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Address deleted successfully!'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete address. Please try again.'
        });
    }
};

module.exports = {
    addAddress,
    editAddress,
    deleteAddress
};
