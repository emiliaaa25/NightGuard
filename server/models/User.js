const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    full_name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone_number: { type: String },
    bio: { type: String },
    user_type: { type: String, default: 'user' }, 
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
