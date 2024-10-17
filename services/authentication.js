const JWT = require("jsonwebtoken");
require('dotenv').config();
const { v4: uuidv4 } = require("uuid"); 

const secret = process.env.JWT_SECRET;

function createTokenForUser(user) {
    const payload = {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        creditleft: user.creditleft,
        creditused: user.creditused,
        userId: user.userId,
        uuid: uuidv4() 
    };
    const token = JWT.sign(payload, secret, { expiresIn: '1h' });
    return token;
}

function validateToken(token) {
    try {
        const payload = JWT.verify(token, secret);
        return payload;
    } catch (err) {
        console.error('Invalid token:', err);
        return null; 
    }
}

module.exports = {
    createTokenForUser, validateToken
};
