const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  passwordHash: {
    type: String
  }
}, {
  timestamps: true
});

userSchema.index({ createdAt: 1 });

// Virtual for password (not stored)
userSchema.virtual('password').set(function(password) {
  this._password = password;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this._password) return next();

  try {
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(this._password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.checkPassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user._password;
  return user;
};

module.exports = mongoose.model('User', userSchema);