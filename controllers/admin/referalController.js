
const User = require('../../models/userRegister');
const Wallet = require('../../models/walletModel')


const getReferral = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalUsers = await User.countDocuments({ isDeleted: false, role: 'user' });
        const totalPages = Math.ceil(totalUsers / limit);

        // Get paginated users
        const users = await User.find({ isDeleted: false, role: 'user' })
            .select('name email referralCode referralCount')
            .populate('referredBy', 'name email')
            .skip(skip)
            .limit(limit);

        const usersWithWallet = await Promise.all(users.map(async (user) => {
            const wallet = await Wallet.findOne({ userId: user._id });
            return {
                ...user.toObject(),
                walletBalance: wallet ? wallet.balance : 0
            };
        }));

        res.render('admin/referralManagement', { 
            users: usersWithWallet,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        res.status(500).render('admin/error', { error: 'Failed to fetch referrals' });
    }
};


module.exports = {
    getReferral,
}