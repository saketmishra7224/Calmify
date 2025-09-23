const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const generateAccessToken = (user) => {
  return generateToken({
    id: user._id,
    email: user.email,
    role: user.role
  });
};

const generateRefreshToken = (user) => {
  return generateToken({
    id: user._id,
    type: 'refresh'
  });
};

module.exports = {
  generateToken,
  verifyToken,
  generateAccessToken,
  generateRefreshToken
};