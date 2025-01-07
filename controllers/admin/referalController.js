
const User = require('../../models/userRegister');
const Wallet = require('../../models/walletModel')


const getReferral = async (req, res) => {
    try {
        const users = await User.find({ isDeleted: false, role : 'user' })
            .select('name email referralCode referralCount')
            .populate('referredBy', 'name email');

        const usersWithWallet = await Promise.all(users.map(async (user) => {
            const wallet = await Wallet.findOne({ userId: user._id });
            return {
                ...user.toObject(),
                walletBalance: wallet ? wallet.balance : 0
            };
        }));

        res.render('admin/referralManagement', { users: usersWithWallet });
    } catch (error) {
        res.status(500).render('admin/error', { error: 'Failed to fetch referrals' });
    }
};



module.exports = {
    getReferral,
}