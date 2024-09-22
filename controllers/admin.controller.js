const User = require("../models/user");
require('dotenv').config();
const jwt = require('jsonwebtoken');

const { BadRequestError, NotFoundError, InternalServerError, UnauthorizedError } = require('../errors');

const AdminController = {};

AdminController.signin = async (req, res) => {
    const { password } = req.body;
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (password !== adminPassword) {
            return res.status(new UnauthorizedError('Incorrect Password').statusCode).json({ error: 'Incorrect Password' });
        }

        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.json({ message: 'Login successful' });

    } catch (error) {
        console.error('Error during signin:', error);
        res.status(new InternalServerError().statusCode).json({ error: 'Internal Server Error' });
    }
};

AdminController.logout = (res) => {
    try {
        res.clearCookie('token', { path: '/', sameSite: 'None', secure: true });
        res.status(200).json({ message: 'You are logged out' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(new InternalServerError('Internal Server Error').statusCode).json({ error: 'Internal Server Error' });
    }
};


AdminController.updateUserCredit = async (req, res) => {
    const { userId } = req.params;
    const { creditleft, creditused } = req.body;

    try {
        if (creditleft !== undefined && typeof creditleft !== 'number') {
            return res.status(new BadRequestError('creditleft must be a number').statusCode).json({ error: 'creditleft must be a number' });
        }
        if (creditused !== undefined && typeof creditused !== 'number') {
            return res.status(new BadRequestError('creditused must be a number').statusCode).json({ error: 'creditused must be a number' });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(new NotFoundError('User not found').statusCode).json({ error: 'User not found' });
        }

        if (creditleft !== undefined) {
            user.creditleft = creditleft;
        }
        if (creditused !== undefined) {
            user.creditused = creditused;
        }

        await user.save();
        res.json({ message: 'User credits updated successfully', user });
    } catch (error) {
        console.error('Error updating user credits:', error);
        res.status(new InternalServerError('Internal Server Error').statusCode).json({ error: 'Internal Server Error' });
    }
};

AdminController.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(new InternalServerError('Failed to fetch users').statusCode).json({ error: 'Failed to fetch users' });
    }
};

AdminController.getUsersByRole = async (req, res) => {
    const { role } = req.params;

    try {
        const validRoles = ['USER', 'USER2', 'ADMIN'];
        if (!validRoles.includes(role)) {
            return res.status(new BadRequestError('Invalid role').statusCode).json({ error: 'Invalid role' });
        }

        const users = await User.find({ role });
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(new InternalServerError('Failed to fetch users by role').statusCode).json({ error: 'Failed to fetch users by role' });
    }
};

AdminController.deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findOneAndDelete({ userId });
        if (!user) {
            return res.status(new NotFoundError('User not found').statusCode).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(new InternalServerError('Failed to delete user').statusCode).json({ error: 'Failed to delete user' });
    }
};

module.exports = AdminController;
