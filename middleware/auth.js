const jwt = require('jsonwebtoken');
require('dotenv').config();

const checkForAuthenticationCookie = (req, res, next) => {
    // First check if cookies or headers exist before accessing them
    const token = req.cookies?.token || (req.headers && req.headers['authorization']?.split(' ')[1]);
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        req.user = decoded;
        next();
    });
};

module.exports = checkForAuthenticationCookie;
