const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  category: { type: String, required: true },
  selectedCategory: { type: String },
  predictedTemp: { type: Object }, // Stores full prediction snapshot
  user: {
    fullName: String,
    email: String,
    role: String
  },
  feedback: [
    {
      accuracy: String,
      bound: String,
      expected: String,
      reason: String
    }
  ]
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('PredictedFeedback', feedbackSchema);
