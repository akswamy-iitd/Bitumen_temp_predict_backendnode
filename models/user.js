const bcrypt = require('bcrypt');
const { Schema, model } = require('mongoose');
require('dotenv').config();
const { createTokenForUser } = require('../services/authentication');


const SALT_WORK_FACTOR = 10;

const deviceSchema = new Schema({
    type: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    platform: { type: String, default: 'Unknown' },
});

const locationSchema = new Schema({
    type: { type: String, default: 'Unknown' },
    city: { type: String, default: 'Unknown' },
    region: { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown' },
});

const loginHistorySchema = new Schema({
    ip: { type: String, required: true },
    device: { type: deviceSchema, required: true },  // Use the deviceSchema here
    location: { type: locationSchema, required: true },  // Use the locationSchema here
    logintime: { type: Date, default: Date.now },
});

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
    loginHistory: [loginHistorySchema],  // Use the loginHistorySchema here
}, { timestamps: true });


// Pre-save hook to hash the password
userSchema.pre("save", async function (next) {
    const user = this;

    if (!user.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        user.salt = salt;
        user.password = hashedPassword;
        next();
    } catch (err) {
        return next(err);
    }
});

// Password match & Token generation
userSchema.statics.matchPasswordAndGenerateToken = async function (email, password, clientIp, deviceInfo = {}, locationInfo = {}) {
    const user = await this.findOne({ email });
    if (!user) throw new Error('User not found!');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Incorrect Password');

    // Log login attempt
    user.loginHistory.push({
        ip: clientIp,
        device: {
            type: deviceInfo?.type || 'Unknown',
            os: deviceInfo?.os || 'Unknown',
            platform: deviceInfo?.platform || 'Unknown',
        },
        location: {
            type: locationInfo?.type || 'Unknown',
            city: locationInfo?.city || 'Unknown',
            region: locationInfo?.region || 'Unknown',
            country: locationInfo?.country || 'Unknown',
        },
        logintime: new Date(),
    });

    await user.save();  // Save login history

    // Generate JWT Token
    const token = createTokenForUser(user);
    return { token, user };
};


// Sign-up logic
userSchema.statics.signup = async function (fullName, email, password, creditleft = 10, role = "USER") {
    const validRoles = ["USER", "PRO_USER"];
    if (!validRoles.includes(role)) throw new Error('Invalid role specified');

    const existingUser = await this.findOne({ email });
    if (existingUser) throw new Error('User already exists');

    const lastUser = await this.findOne().sort('-userId');
    const newUserId = lastUser && lastUser.userId ? lastUser.userId + 1 : 100000;

    const user = new this({
        userId: newUserId,
        fullName,
        email,
        password,
        role,
        creditleft,

    });

    // Save the new user to the database
    await user.save();
    return user;
};

const User = model('User', userSchema);
module.exports = User;
