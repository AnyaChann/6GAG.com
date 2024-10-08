const jwt = require("jsonwebtoken");

exports.generateToken = (user) => {
  return jwt.sign(
    {
      email: user.email,
      userId: user._id.toString()
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
};