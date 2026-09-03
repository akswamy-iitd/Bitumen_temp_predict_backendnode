const bcrypt = require('bcryptjs');
const { Schema, model } = require('mongoose');
require('dotenv').config();
const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);


const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    googleId: {
        type: String,
    },
    salt: {
        type: String,
    },
    password: {
        type: String,
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



userSchema.plugin(AutoIncrement, { inc_field: 'userId', start_seq: 100000 });
// Sign-up logic
userSchema.statics.signup = async function (fullName, email,googleid, password=null, creditleft = 10, role) {
    console.log("signup",fullName, email,googleid, password, creditleft);

    const existingUser = await this.findOne({ email });
    if (existingUser) throw new Error('User already exists');

    const user = new this({
        fullName,
        email,
        password,
        role,
        creditleft,
        googleid
    });

    // Save the new user to the database
    await user.save();
    return user;
};

const User = model('User', userSchema);
module.exports = User;
