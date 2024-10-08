const User = require("../users/model");
const omit = require("lodash/omit");
const { validationResult } = require("express-validator");
const { generateToken, hashPassword, comparePassword } = require("./auth");

exports.getAuthenUser = (req, res, next) => {
  const userId = req.userId;
  return User.findById(userId)
    .populate("homeCountry", "name")
    .then(user => {
      if (!user || (user && !user.active)) {
        const error = new Error("account_not_found");
        error.statusCode = 401;
        throw error;
      }
      res.status(200).json(user);
    })
    .catch(error => {
      next(error);
    });
};

exports.loginSocialUser = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("user_validation_failed");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const { email, name, avatarURL, birthday, social } = req.body;
  const password = process.env.DEFAULT_PASSWORD;

  return User.findOne({ email })
    .then(user => {
      if (!user) {
        const username = email.split("@")[0];
        const newUser = new User({
          username,
          name,
          password,
          email,
          avatarURL,
          birthday,
          social: [social],
          verified: true
        });
        return newUser.save();
      } else {
        const isLinked = user.social.some(each => each.type === social.type);
        if (isLinked) {
          return Promise.resolve(user);
        } else {
          user.social.push(social);
          return user.save();
        }
      }
    })
    .then(result => {
      const token = generateToken(result);
      const resUser = omit(result.toObject(), ["password", "createdAt", "updatedAt", "active"]);
      res.status(200).json({
        message: "login_social_succeed",
        token,
        user: resUser
      });
    })
    .catch(error => {
      const { errmsg } = error;
      if (errmsg && errmsg.includes("email")) {
        error = new Error(social.type === "GOOGLE" ? "fb_taken" : "gg_taken");
        error.statusCode = 401;
      }
      next(error);
    });
};

exports.login = (req, res, next) => {
  const { email, password } = req.body;
  let loadedUser;

  return User.findOne({ email, active: 1 })
    .lean()
    .then(user => {
      if (!user) {
        const error = new Error("account_not_found");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return comparePassword(password, user.password);
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error("wrong_password");
        error.statusCode = 401;
        throw error;
      }
      const token = generateToken(loadedUser);
      const resUser = omit(loadedUser, ["password", "createdAt", "updatedAt", "active"]);
      res.status(200).json({
        message: "login_succeed",
        token,
        user: resUser
      });
    })
    .catch(error => {
      next(error);
    });
};