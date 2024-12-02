
const isAuthenticatedAdmin = (req, res, next) => {
    try {
        if (req.session && req.session.admin) {
            // Admin is authenticated
            return next();
        }
        // Redirect or handle unauthenticated access
        return res.redirect('/admin/login');
    } catch (error) {
        console.error('Authentication Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = { isAuthenticatedAdmin };
