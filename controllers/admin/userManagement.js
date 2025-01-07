/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
//  U S E R   M A N A G E M E N T
// ----------------------------------------------------------------

const User = require('../../models/userRegister')

const loadUserManagement = async (req, res) => {
    try {
        const users = await User.find({role:'user'});
        if (!users) {
            return res.status(200).render('admin/userManagement', { msg: 'No users found' });
        }
        return res.status(200).render('admin/userManagement', { user: users });
    } catch (error) {
        console.error('Error loading users: ', error);
        return res.status(500).json({ message: 'Internal Server Error' });    }
}



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


module.exports ={
    loadUserManagement,
    userBan,
    viewUserDetails
}