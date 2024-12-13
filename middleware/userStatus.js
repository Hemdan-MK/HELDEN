const userSchema = require('../models/userRegister');

const checkUserStatus = async (req, res, next) => {
    if (req.session.user) {
        // User is logged in, validate their status
        try {

            const user = await userSchema.findById(req.session.user.id);
            if (!user) {
                // User does not exist in the database (account deleted)
                console.log('User account does not exist. Destroying session.');
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                    return res.redirect('/home?status=deleted');
                });
            } else if (user.isDeleted === true ) {
                // User account is banned
                console.log('User account is banned. Destroying session.');
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                    return res.redirect('/home?status=banned');
                });
            } else {
                // User is active
                return next();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            return res.status(500).send('Internal Server Error');
        }
    } else {
        // No session present, user is not logged in
        return res.redirect('/home?status=noUsers');
    }
};

module.exports = checkUserStatus;

