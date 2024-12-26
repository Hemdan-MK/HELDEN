
const Wallet = require('../../models/walletModel')

const wallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 5 } = req.query; // Default page=1, limit=5

        // Fetch wallet details (assuming balance is part of the wallet)
        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.status(404).json({
                message: "Wallet not found",
                balance: 0,
                transactions: [],
                totalPages: 0,
                currentPage: 0,
            });
        }

        // Paginate transactions
        const skip = (page - 1) * limit;
        const transactions = wallet.transactions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort transactions (latest first)
            .slice(skip, skip + Number(limit)); // Paginate the transactions

        // Total pages
        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        res.status(200).json({
            balance: wallet.balance,
            transactions,
            totalPages,
            currentPage: Number(page),
        });
    } catch (error) {
        console.error("Error fetching wallet:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = {
    wallet
}