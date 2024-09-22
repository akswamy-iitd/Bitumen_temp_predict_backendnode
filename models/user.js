const { createHmac, randomBytes } = require('crypto');
const { Schema, model } = require('mongoose');
const { createTokenForUser } = require('../services/authentication');
require('dotenv').config();

const userSchema = new Schema({
    userId: {
        type: Number,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    salt: {
        type: String,
    },
    password: {
        type: String,
        required: true,
    },
    creditleft: {
        type: Number,
        default: 10,
    },
    creditused: {
        type: Number,
        default: 0,
    },
    role: {
        type: String,
        enum: ["USER", "PRO_USER"],
        default: "USER",
    },
}, { timestamps: true });

// Pre-save hook to hash the password
userSchema.pre("save", function (next) {
    const user = this;

    if (!user.isModified("password")) return next();

    const salt = randomBytes(16).toString('hex');
    const hashedPassword = createHmac('sha256', salt)
        .update(user.password)
        .digest('hex');

    user.salt = salt;
    user.password = hashedPassword;

    next();
});
userSchema.statics.matchPasswordAndGenrateToken = async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error('User not found!');

    const salt = user.salt;
    const hashedPassword = user.password;

    const userProvidedHash = createHmac('sha256', salt)
        .update(password)
        .digest('hex');
      
    if (hashedPassword !== userProvidedHash)
        throw new Error('Incorrect Password');

    const token = createTokenForUser(user);
    return token;
};

userSchema.statics.signup = async function (fullName, email, password, role = "USER") {
    const validRoles = ["USER", "PRO_USER"];
    if (!validRoles.includes(role)) throw new Error('Invalid role specified');

    const existingUser = await this.findOne({ email });
    if (existingUser) throw new Error('User already exists');

    const lastUser = await this.findOne().sort('-userId');

    console.log("Last User found:", lastUser);

    const newUserId = lastUser && lastUser.userId ? lastUser.userId + 1 : 100000;

    if (isNaN(newUserId)) {
        throw new Error('userId is NaN, something went wrong');
    }

    console.log("Generated userId:", newUserId);

    const user = new this({
        userId: newUserId,
        fullName,
        email,
        password,
        role
    });

    // Save the new user to the database
    await user.save();
    return user;
};

const User = model('User', userSchema);
module.exports = User;
