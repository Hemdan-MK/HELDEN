const User = require('../../models/userRegister');


// Load Dashboard Page
const getDashboard = async (req, res) => {
    try {
        return res.status(200).render('admin/dashboard', { admin: req.session.admin });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        return res.status(500).send('Server error');
    }
};

// Load Login Page
const getLoginPage = (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard'); // Redirect if already logged in
        }
        return res.status(200).render('admin/login');
    } catch (error) {
        console.error('Error loading login page:', error);
        return res.status(500).send('Server error');
    }
};

// Handle Admin Login
const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email, password);
        
        // Find admin user by email and password
        const admin = await User.findOne({ email : email, password: password, role: 'admin' });
        if (admin) {
            req.session.admin = { id: admin._id, email: admin.email }; // Store only necessary info in session
            return res.redirect('/admin/dashboard');
        } else {
            return res.status(401).render('admin/login', { message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        return res.status(500).send('Server error');
    }
};

// Handle Logout
const logoutAdmin = (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error during admin logout:', err);
                return res.status(500).send('Server error');
            }
            return res.redirect('/admin/login'); // Redirect to login after logout
        });
    } catch (error) {
        console.error('Error during admin logout:', error);
        return res.status(500).send('Server error');
    }
};

module.exports = {
    getDashboard,         // GET: /admin/dashboard
    getLoginPage,         // GET: /admin/login
    postLogin,            // POST: /admin/login
    logoutAdmin           // POST: /admin/logout
};
