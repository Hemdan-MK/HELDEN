/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//  U S E R   M A N A G E M E N T
// ----------------------------------------------------------------

const User = require('../../models/userRegister')

const loadUserManagement = async (req, res) => {
    try {
        // Get page and limit from query parameters, with defaults
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 users per page

        // Calculate the starting index
        const startIndex = (page - 1) * limit;

        // Get the total count of users
        const totalUsers = await User.countDocuments({ role: 'user' });

        // Retrieve users for the current page
        const users = await User.find({ role: 'user' })
            .skip(startIndex)
            .limit(limit);

        if (users.length === 0) {
            return res.status(200).render('admin/userManagement', { msg: 'No users found' });
        }

        // Calculate total pages
        const totalPages = Math.ceil(totalUsers / limit);

        // Render the user management page with pagination info
        return res.status(200).render('admin/userManagement', {
            user: users,
            currentPage: page,
            totalPages: totalPages,
            limit
        });
    } catch (error) {
        console.error('Error loading users: ', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};



const userBan = async (req, res) => {
    try {
        const email = req.query.email; // Get email from query parameter

        // Find the user by email
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isDeleted = !user.isDeleted; // Toggle the ban status
        await user.save(); // Save the updated user data

        const status = user.isDeleted ? 'banned' : 'unbanned';
        return res.status(200).json({ message: `User ${status} successfully`, isDeleted: user.isDeleted });
    } catch (error) {
        console.error('Error banning/unbanning user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const viewUserDetails = async (req, res) => {
    try {
        const email = req.query.email;

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Send the user data back to the client
        res.status(200).json({
            username: user.name,
            email: user.email,
            role: user.role,
            joinDate: user.createdAt.toISOString().split('T')[0], // Format the date as needed
            isDeleted: user.isDeleted
        });

    } catch (error) {
        console.error('Error fetching user details : ', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}


const searchUsers = async (req, res) => {
    try {
        const searchQuery = req.query.query || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        // Create a search filter that matches either name or email
        const searchFilter = {
            role: 'user',
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ]
        };

        // Get total count of matching users
        const totalUsers = await User.countDocuments(searchFilter);

        // Get matching users for current page
        const users = await User.find(searchFilter)
            .skip(startIndex)
            .limit(limit);

        // Calculate total pages
        const totalPages = Math.ceil(totalUsers / limit);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            // If it's an AJAX request, send JSON response
            return res.json({
                users,
                currentPage: page,
                totalPages,
                totalUsers
            });
        } else {
            // If it's a regular request, render the page
            return res.render('admin/userManagement', {
                user: users,
                currentPage: page,
                totalPages,
                limit
            });
        }
    } catch (error) {
        console.error('Error searching users:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    loadUserManagement,
    userBan,
    viewUserDetails,
    searchUsers
}