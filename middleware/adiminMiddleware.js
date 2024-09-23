const jwt = require('jsonwebtoken');
require('dotenv').config();
const { UnauthorizedError } = require('../errors');

const adminMiddleware = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status( UnauthorizedError('No token provided').statusCode).json({ message: 'Unauthorized: No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status( UnauthorizedError('Invalid token').statusCode).json({ message: 'Unauthorized: Invalid token' });
        }

        req.user = decoded;
        next();
    });
};

module.exports = { adminMiddleware };
