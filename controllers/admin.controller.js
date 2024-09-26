const User = require("../models/user");
require('dotenv').config();
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY); 


const AdminController = {};


AdminController.checkUser = async (req, res) => {
    console.log('Checking user');
    const token = req.cookies.token;
    console.log(token);

    if (!token) {
        return res.status(401).json({ error: "No token provided, authorization denied" });
    }
    console.log('Token:', token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded:', decoded);
        if (decoded.role !== 'admin') {
            return res.status(401).json({ error: "Invalid token, authorization denied" });
        }
        console.log('User is admin');
        res.status(200).json({ message: "You are logged" });
    } catch (error) {
        console.error('Error during user check:', error);
        console.log('User is not admin');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
        

AdminController.signin = async (req, res) => {
    const { password } = req.body;
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (password !== adminPassword) {
            return res.status(404).json({ error: "Incorrect Password" });
        }

        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // secure=true only in production
            sameSite: 'None', // For cross-site cookies
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        

        res.json({ message: 'Login successful' });

    } catch (error) {
        console.error('Error during signin:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Admin Logout
AdminController.logout = (req, res) => {
    console.log('Logging out');
    try {
        res.clearCookie('token');
        // console.log('Logged out');
        res.status(200).json({ message: 'You are logged out' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

AdminController.updateUserCredit = async (req, res) => {
    const { credit, userId } = req.body;

    try {
        if (credit !== undefined && typeof credit !== 'number') {
            return res.status(400).json({ error: 'Invalid credit value' });
        }
        if(!userId){
            return res.status(400).json({ error: 'Invalid userId value' });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });   
        }

        user.creditleft = credit;

        await user.save();
        res.json({ message: 'User credits updated successfully', user });
    } catch (error) {
        console.error('Error updating user credits:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// Get all users
AdminController.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get users by role
AdminController.getUsersByRole = async (req, res) => {
    const { role } = req.params;

    try {
        const validRoles = ['USER', 'USER2', 'ADMIN'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        const users = await User.find({ role });
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Delete user
AdminController.deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findOneAndDelete({ userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


AdminController.sendMessage = async (req, res) => {

    const { senderName, senderEmail, message, credit } = req.body;
    console.log(senderName, senderEmail, message, process.env.SENDGRID_API_KEY);
    const { nanoid } = await import('nanoid');
    
    const uniquePassword = nanoid(10); 
    fullName = senderName;
    email = senderEmail;
    password = uniquePassword;
    try {

        await User.signup(fullName, email, password, credit, role = "PRO_USER");

        const msg = {
            to: senderEmail,
            from: 'akswamy.tempreproject@gmail.com',
            subject: 'Your Custom Temp Wizard Account Information',
            text: `Hello ${senderName},\n\nYour Custom Temp Wizard account has been successfully created. Below is your account information:\n\nUsername: ${senderEmail}\nPassword: ${uniquePassword}\n\n${message ? `Message: ${message}\n\n` : ''}Please log in and change your password immediately.\n\nThank you for using Custom Temp Wizard!\n\nBest regards,\nCustom Temp Wizard Team`,
            html: `<p>Hello <strong>${senderName}</strong>,</p>
                   <p>Your Custom Temp Wizard account has been successfully created. Below is your account information:</p>
                   <ul>
                       <li><strong>Username:</strong> ${senderEmail}</li>
                       <li><strong>Password:</strong> ${uniquePassword}</li>
                   </ul>
                   ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
                   <p>Please log in.</p>
                   <p>Thank you for using Custom Temp Wizard!</p>
                   <br>
                   <p>Best regards,<br>Custom Temp Wizard Team</p>`,
        };

        await sgMail.send(msg);
        return res.status(200).json({ message: 'User account created and email sent successfully!', userId: fullName, password: uniquePassword });
    } catch (error) {
        console.error('Error creating user or sending email:', error);
        return res.status(500).json({ error: 'Failed to create user or send email' });
    }
};


module.exports = AdminController;