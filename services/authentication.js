const JWT = require("jsonwebtoken");
require('dotenv').config()

const secret = process.env.JWT_SECRET;

function createTokenForUser(user){
    const payload = {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        creditleft: user.creditleft,
        creditused: user.creditused,
        userId: user.userId
    };
    const token = JWT.sign(payload, secret);
    return token;
}



function validateToken(token){
    const payload = JWT.verify(token, secret);
    return payload;
}

module.exports = {
    createTokenForUser, validateToken
}
