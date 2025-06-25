const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now },
  altitude: Number,
  feedback: { type: String, required: true },
});

module.exports = mongoose.model('Feedback', feedbackSchema);
