const userModel = require('../../models/userRegister')
const otpModel = require('../../models/otpModel')
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing
const otpGenerator = require('otp-generator'); // Import otp-generator
const sendEmail = require('../../utils/mail');

const forgotPassword = async (req, res) => {
    try {
        return res.render('user/forgotPassword', { user: 'hemdan' });
    } catch (error) {
        console.error('Error rendering forgotPassword page:', error);
        return res.status(500).send('Internal Server Error');
    }
};



const ForgetPassRequest = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(409).json({
                msg: "Email not found; please enter a valid email.",
                val: false,
            });
        }

        // Delete any previous OTP records for the given email
        await otpModel.deleteMany({ email });

        // Generate OTP using otp-generator
        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        // Set OTP expiry time (e.g., 10 minutes)
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        // Save OTP to the database
        await otpModel.create({
            email: user.email,
            otp,
            createdAt: Date.now(),
            expiresAt: otpExpiry,
        });

        // Send OTP email (you should have a sendOtpEmail function)
        await sendEmail(user.email, otp);

        return res.status(200).json({
            msg: "OTP successfully sent to your email.",
            val: true,
        });

    } catch (err) {
        console.error('Error in ForgetPassRequest:', err);
        return res.status(500).json({
            val: false,
            msg: "An error occurred while processing your request.",
        });
    }
};

const ForgetPassverify = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const otpRecord = await otpModel.findOne({ email });
        if (otpRecord && otpRecord.otp === otp) {
            return res.status(200).json({ val: true, msg: null });
        } else {
            return res.status(400).json({ val: false, msg: "Enter a valid OTP" });
        }
    } catch (err) {
        res.status(500).json({ val: false });
        console.log(err);
    }
};

const ForgetPassChange = async (req, res) => {
    const { newPassword, email } = req.body;
    try {        
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await userModel.updateOne({ email }, { password: hashedPassword });

        return res.status(200).json({ val: true, msg: null });
    } catch (err) {
        res.status(500).json({ val: false, msg: "Something went wrong" });
        console.log(err);
    }
};

const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the email exists in the OTP database
        const userExists = await otpModel.findOne({ email });
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
        await otpModel.findOneAndUpdate(
            { email },
            {
                otp,
                createdAt: Date.now(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
            },
            { upsert: true } // Create new record if it doesn't exist
        );

        // Send the OTP email
        sendEmail(userExists.email, otp);

        // Respond with success message
        return res.status(200).json({
            success: true,
            message: "OTP resent successfully. Please check your email.",
        });
    } catch (err) {
        console.error('Error in resendOTP:', err);
        res.status(500).json({
            val: false,
            msg: "An error occurred while processing your request.",
        });
    }
}

module.exports = {
    forgotPassword,
    ForgetPassRequest,
    ForgetPassverify,
    ForgetPassChange,
    resendOTP
};
