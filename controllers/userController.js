const otpGenerator = require('otp-generator');
const OTP = require('../models/otpModel');
const User = require('../models/userRegister');
const sendEmail = require('../utils/mail');
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const bcrypt = require('bcrypt')


const loadMain = async (req, res) => {
    try {
        const products = await productModel.find({ isDeleted: false }).sort({ _id: -1 });
        return res.status(200).render('user/home', { user: req.session.user, products })
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
        return res.status(200).render('user/dashboard', { user: req.session.user });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        return res.status(500).send('Server Error');
    }
};

// dash session
const loadDashExtra = async (req, res) => {
    try {
        return res.status(200).render('user/dash', { message: 'hemdan' });
    } catch (error) {
        console.error('Error loading dash:', error);
        return res.status(500).send('Server Error');
    }
};

// Orders session
const loadOrders = async (req, res) => {
    const orders = [
        // Array of order objects as before
    ];
    try {
        return res.status(200).render('user/order', { orders });
    } catch (error) {
        console.error('Error loading orders:', error);
        return res.status(500).send('Server Error');
    }
};

// Update Profile session
const loadUpdateProfile = async (req, res) => {
    try {
        return res.status(200).render('user/updateProfile');
    } catch (error) {
        console.error('Error loading update profile:', error);
        return res.status(500).send('Server Error');
    }
};

// My Address session
const loadMyAddress = async (req, res) => {
    try {
        return res.status(200).render('user/myAddress');
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
        return res.status(200).render('user/wallet');
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
        return res.status(200).render('user/register', { user: req.session.user });
    } catch (error) {
        console.error('Error loading register:', error);
        return res.status(500).send('Server Error');
    }
}

const loadLogin = async (req, res) => {
    try {
        return res.status(200).render('user/login', { user: req.session.user });
    } catch (error) {
        console.error('Error loading login:', error);
        return res.status(500).send('Server Error');
    }
}




const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(req.body);

        // Find user by email
        const user = await User.findOne({ email, isDeleted: false });
        console.log('user : '+user);
        if (!user) {
            return res.render('user/login', { message: 'User not found', user: null, showAlert: true });
        }

        // Compare entered password with stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('iSMATCH : '+isMatch);
        
        if (!isMatch) {
            return res.render('user/login', { message: 'Incorrect password', user: null, showAlert: true });
        }

        req.session.user = user;

        const products = await productModel.find({ isDeleted: false });
        return res.render('user/home', { user: req.session.user, products });
    } catch (error) {
        console.error('login error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};


const checkuser = async (req, res) => {
    try {
        const { name, email, phno, password } = req.body;

        console.log(req.body);

        // Find user by email
        const checkUserPresent = await User.findOne({ email });

        // If user exists, respond with success: true
        if (checkUserPresent) {
            return res.json({ success: false, message: "User already registered." });
        } else {
            req.session.user = req.body;

            // const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, 10);
            req.session.user.password = hashedPassword;

            req.session.user.verified = false;        // veruthe oru brandth
            console.log(req.session);

            // If user found with provided email

            let otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            console.log('this is the otp ---> : ' + otp);

            const otpBody = await OTP.create({
                email, otp, createdAt: Date.now(), expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });
            sendEmail(email, otp)

            // If user does not exist, respond with success: false
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
        console.log(req.session.user);
        console.log(email);
        return res.status(200).render('user/otp', { email, user: req.session.user });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};




const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("this is the resetOTP : " + email);


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
        console.log('Resending OTP: ' + otp);

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
        console.log(req.session);
        console.log(req.body);


        // Find the OTP record associated with the email
        const otpRecord = await OTP.findOne({ email, otp });

        // If no matching OTP is found, return an error
        if (!otpRecord) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired OTP. Please try again.",
            });
        }

        // Check if the OTP has expired
        if (otpRecord.expiresAt < Date.now()) {
            // Delete the expired OTP from the database
            await OTP.deleteOne({ email, otp });

            return res.status(401).json({
                success: false,
                message: "OTP has expired. Please request a new one.",
            });
        }

        // At this point, OTP is valid; proceed with user registration or activation
        // For example, you could set the user as "verified" or proceed with additional registration steps
        console.log(req.session.user);
        const userData = req.session.user
        const hashedPassword = await bcrypt.hash(req.session.user.password, 10);

        const newUser = new User({
            name: userData.name,
            email: userData.email,
            phone: userData.phno,
            password: hashedPassword,  // Ideally, hash this password before saving
            role: userData.role || 'user', // Default to 'user' if not specified
            isValid: true,
        });

        const savedUser = await newUser.save();
        console.log("User saved successfully:", savedUser);

        // req.session.user.verified = true;

        // Delete the OTP record after successful verification
        await OTP.deleteOne({ email, otp });
        delete req.session.user.password;

        // Redirect to a success page or respond with success message
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully! Your account is now activated.",
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};


const getProductDetail = async (req, res) => {
    try {
        // Get product ID from route parameters
        const productId = req.params.id;

        // Fetch product from the database
        const product = await productModel.findById(productId);
        console.log(product.tags);
        const productAll = await productModel.find({ isDeleted: false });
        const category = await categoryModel.findById(product.category)
        // const related1 = await productModel.find({ tags: product.tags })
        const related = await productModel.find({
            tags: { $in: product.tags },  // Match products with any tag from the current product's tags
            _id: { $ne: product._id }    // Exclude the current product
        });

        console.log(related);
        



        // Check if the product exists
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Render the product detail page and pass the product data to the view
        return res.status(200).render('user/productPage', { product, user: req.session.user, productAll, category, related });
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).send('Server error');
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
    loadDashExtra,
    loadRegister,
    loadLogin,
    login,
    loadOTP,
    resendOTP,
    verifyOTP,
    checkuser,
    getProductDetail
    // loadSession
}