const jwt = require('jsonwebtoken');
require('dotenv').config();

const adminMiddleware = (req, res, next) => {
    const token = req.cookies.admin_token || req.headers['authorization']?.split(' ')[1];
    console.log('Token234:', token);
    if (!token) {
        return res.json({ message: 'Unauthorized: No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.json({ message: 'Unauthorized: Invalid token' });
        }

        req.user = decoded;
        next();
    });
};

module.exports = { adminMiddleware };
