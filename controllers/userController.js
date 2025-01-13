const otpGenerator = require('otp-generator');
const OTP = require('../models/otpModel');
const User = require('../models/userRegister');
const sendEmail = require('../utils/mail');
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const bcrypt = require('bcrypt');
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');

const loadMain = async (req, res) => {
    try {

        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });

        const products = await productModel.find({
            isDeleted: false,
            "stockManagement.quantity": { $gt: 0 },
        }).sort({ _id: -1 });

        const offerProducts = await productModel.aggregate([
            {
                $match: {
                    isDeleted: false,
                },
            },
            {
                $addFields: {
                    totalStock: {
                        $sum: "$stockManagement.quantity"
                    },
                },
            },
            {
                $match: {
                    totalStock: { $gt: 0 },
                },
            },
            {
                $addFields: {
                    discountPercentage: {
                        $multiply: [
                            { $divide: [{ $subtract: ["$price", "$offerPrice"] }, "$price"] },
                            100
                        ]
                    },
                },
            },
            {
                $sort: { discountPercentage: -1 },
            },
            {
                $limit: 8,
            },
        ]) || [];


        return res.status(200).render('user/home', { user: req.session.user, products: products || [], offerProducts })
    } catch (error) {
        console.error('error : ', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

const loadShop = async (req, res) => {
    try {
        // Find categories that are not deleted
        const activeCategories = await categoryModel.find({ isDeleted: false }).select('_id');

        // Extract category IDs from the result
        const activeCategoryIds = activeCategories.map(category => category._id);

        // Fetch products where `isDeleted: false` and the category is in the list of active categories
        const products = await productModel.find({
            isDeleted: false,
            category: { $in: activeCategoryIds },
        }).sort({ _id: -1 });

        // Render the shop page with the filtered products
        return res.status(200).render('user/shop', { user: req.session.user, products });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const loadAbout = async (req, res) => {
    try {
        return res.status(200).render('user/about', { user: req.session.user })
    } catch (error) {
        console.error('error : ', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

const loadContact = async (req, res) => {
    try {
        return res.status(200).render('user/contact', { user: req.session.user })
    } catch (error) {
        console.error('error : ', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// loading dashboard
const loadDash = async (req, res) => {
    try {
        const user = req.session.user
        let userData = await User.findById(user.id)
        return res.status(200).render('user/dashboard', { user: req.session.user, userData });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        return res.status(500).send('Server Error');
    }
};


// Orders session
const loadOrders = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1; // Get page from query params
        const limit = 2; // Number of orders per page
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalOrders = await Order.countDocuments({
            userId
        });

        const totalPages = Math.ceil(totalOrders / limit);

        // Get paginated orders
        const orders = await Order.find({
            userId,
        })
            .populate('orderItems.productId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).render('user/order', {
            orders,
            user: req.session.user,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        return res.status(500).send('Server Error');
    }
};

// Update Profile session
const loadUpdateProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId).select('name email phone');

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Render the profile update page with existing user data
        res.render('user/updateProfile', {
            user: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        // Validate data (you can add more validation logic if necessary)
        if (!email) {
            return res.status(400).send('Email is required');
        }

        // Update the user profile
        const updatedUser = await User.findByIdAndUpdate(
            req.session.user.id,
            {
                name,
                email,
                phone
            },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).send('User not found');
        }

        // Respond with a success message
        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

// My Address session
const loadMyAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const person = await User.findById(userId)
        return res.status(200).render('user/myAddress', { addresses: person.address, user: req.session.user });
    } catch (error) {
        console.error('Error loading address:', error);
        return res.status(500).send('Server Error');
    }
};

// Change Password session
const loadChangePassword = async (req, res) => {
    try {
        return res.status(200).render('user/changePassword');
    } catch (error) {
        console.error('Error loading change password:', error);
        return res.status(500).send('Server Error');
    }
};

// Wallet session
const loadWallet = async (req, res) => {
    try {
        return res.status(200).render('user/wallet', { user: req.session.user });
    } catch (error) {
        console.error('Error loading wallet:', error);
        return res.status(500).send('Server Error');
    }
};


const logout = async (req, res) => {
    try {
        req.session.destroy(); // Clear the session
        return res.status(200).redirect('/home'); // Redirect to login page
    } catch (error) {
        console.log(error);
        return res.status(500).send('Server Error'); // Handle server errors
    }
}

const loadRegister = async (req, res) => {
    try {
        const referralCode = req.query.ref || '';
        if (req.session.user) {
            res.redirect('/home');
        } else {
            return res.status(200).render('user/register', {
                user: req.session.user,
                referralCode
            });
        }
    } catch (error) {
        console.error('Error loading register:', error);
        return res.status(500).send('Server Error');
    }
}

const loadLogin = async (req, res) => {
    try {
        if (req.session.user) {
            res.redirect('/home');
        } else {
            return res.status(200).render('user/login', { user: req.session.user });
        }
    } catch (error) {
        console.error('Error loading login:', error);
        return res.status(500).send('Server Error');
    }
}




const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email, isDeleted: false });
        if (!user) {
            return res.render('user/login', { message: 'User not found', user: null, showAlert: true });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.render('user/login', { message: 'Incorrect password', user: null, showAlert: true });
        }

        const getReferralCode = await User.findOne({ email }, { referralCode: 1, _id: 0 });

        req.session.user = {
            email: user.email,
            name: user.name,
            id: user._id,
            referralCode: getReferralCode.referralCode
        };

        const products = await productModel.find({ isDeleted: false });
        // return res.render('user/home', { user: req.session.user, products });
        return res.redirect('/home');
    } catch (error) {
        console.error('login error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const checkuser = async (req, res) => {
    try {
        const { name, email, phno, password, referralCode } = req.body;

        // Find user by email
        const checkUserPresent = await User.findOne({ email });

        // If user exists, respond with success: false
        if (checkUserPresent) {
            return res.json({ success: false, message: "User already registered." });
        } else {
            req.session.user = req.body;

            // Store referral code in session if it exists
            if (referralCode) {
                // Verify if referral code exists
                const referrer = await User.findOne({ referralCode });
                if (referrer) {
                    req.session.user.referredBy = referrer._id;
                }
            }

            req.session.user.password = password;
            req.session.user.verified = false;

            let otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });

            const otpBody = await OTP.create({
                email,
                otp,
                createdAt: Date.now(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });
            sendEmail(email, otp)

            return res.json({ success: true, message: "User does not exist." });
        }
    } catch (error) {
        console.error('checkuser error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};


const loadOTP = async (req, res) => {
    try {
        const { email } = req.session.user
        return res.status(200).render('user/otp', { email, user: req.session.user });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};




const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the email exists in the OTP database
        const userExists = await OTP.findOne({ email });
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: "User with this email does not exist.",
            });
        }

        // Generate a new OTP
        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        // Update or create OTP record with new expiration time
        await OTP.findOneAndUpdate(
            { email },
            {
                otp,
                createdAt: Date.now(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
            },
            { upsert: true } // Create new record if it doesn't exist
        );

        // Send the OTP email
        sendEmail(email, otp);

        // Respond with success message
        return res.status(200).json({
            success: true,
            email: email,
            message: "OTP resent successfully. Please check your email.",
        });
    } catch (error) {
        console.error("Error resending OTP:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};


const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find the OTP record associated with the email
        const otpRecord = await OTP.findOne({ email, otp });

        if (!otpRecord || otpRecord.expiresAt < Date.now()) {
            if (otpRecord) {
                await OTP.deleteOne({ email, otp });
            }
            return res.status(401).json({
                success: false,
                message: otpRecord ? "OTP has expired. Please request a new one." : "Invalid or expired OTP. Please try again.",
            });
        }

        const userData = req.session.user;
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create new user with referral data if exists
        const newUser = new User({
            name: userData.name,
            email: userData.email,
            phone: userData.phno,
            password: hashedPassword,
            role: userData.role || 'user',
            isValid: true,
            referredBy: userData.referredBy || null  // Add referral data
        });

        const savedUser = await newUser.save();

        // Create wallet for new user with signup bonus
        await new Wallet({
            userId: savedUser._id,
            balance: 0, // Initial balance
            transactions: []
        }).save();

        // Handle referral bonus if user was referred
        if (userData.referredBy) {
            // Update referrer's wallet
            const referrerWallet = await Wallet.findOne({ userId: userData.referredBy });
            if (referrerWallet) {
                referrerWallet.balance += 100;
                referrerWallet.transactions.push({
                    amount: 100,
                    type: 'Credit',
                    description: `Referral bonus for referring ${savedUser.email}`
                });
                await referrerWallet.save();
            }

            // Update new user's wallet with referral bonus
            const userWallet = await Wallet.findOne({ userId: savedUser._id });
            if (userWallet) {
                userWallet.balance += 100;
                userWallet.transactions.push({
                    amount: 100,
                    type: 'Credit',
                    description: 'Signup bonus from referral'
                });
                await userWallet.save();
            }

            // Increment referrer's referral count
            await User.findByIdAndUpdate(userData.referredBy, {
                $inc: { referralCount: 1 }
            });
        }

        // Delete OTP after verification
        await OTP.deleteOne({ email, otp });

        const getReferralCode = await User.findOne({ email }, { referralCode: 1, _id: 0 });

        req.session.user = {
            name: savedUser.name,
            email: savedUser.email,
            id: savedUser._id,
            referralCode: getReferralCode.referralCode
        };

        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully! Your account is now activated.",
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};


const loadRefer = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const wallet = await Wallet.findOne({ userId: req.session.user.id });

        // Get referred users
        const referredUsers = await User.find({ referredBy: req.session.user.id })
            .select('name email createdAt');

        res.render('user/referrals', {
            user,
            wallet,
            referredUsers
        });
    } catch (error) {
        res.status(500).render('error', { error: 'Failed to fetch referral data' });
    }
}


const generateReferal = async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        const referralLink = `${baseUrl}/register?ref=${req.session.user.referralCode}`;
        res.json({ referralLink });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate referral link' });
    }
}

module.exports = {
    loadMain,
    loadShop,
    loadContact,
    loadAbout,
    loadDash,
    loadMyAddress,
    loadChangePassword,
    loadOrders,
    loadUpdateProfile,
    loadWallet,
    logout,
    loadRegister,
    loadLogin,
    loadRefer,
    login,
    loadOTP,
    resendOTP,
    verifyOTP,
    checkuser,
    updateProfile,
    generateReferal
}