const { validationResult } = require("express-validator");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const omit = require("lodash/omit");
const bcrypt = require("bcryptjs");

const User = require("./model");
const ResetPasswordToken = require("./ResetPasswordToken/model");
const VerifyToken = require("./VerifyToken/model");
const { sendEmail } = require("../../common/util/email/email");

const createError = (message, statusCode, data = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (data) error.data = data;
  return error;
};

const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError("user_validation_failed", 422, errors.array());
  }
};

exports.checkEmailExisted = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const { email } = req.body;
    const user = await User.findOne({ email, active: 1 });
    if (!user) {
      return res.status(200).json({ message: "account_not_found" });
    }
    return res.status(200).json({ message: "account_found" });
  } catch (err) {
    next(err);
  }
};

exports.getUserNames = async (req, res, next) => {
  try {
    const users = await User.find();
    const usernames = users.map(user => ({ username: user.username, _id: user._id }));
    res.status(200).json(usernames);
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user || !user.active) {
      throw createError("account_not_found", 400);
    }
    res.status(200).json({ message: "user_info_retrieved", user });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const { email, name, password, avatarURL, birthday } = req.body;
    const username = email.split("@")[0];

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ name, username, password: hashedPassword, email, avatarURL, birthday });
    const result = await user.save();

    const token = jwt.sign({ email: result.email, userId: result._id.toString() }, process.env.JWT_SECRET, { expiresIn: "12h" });
    const resUser = omit(result.toObject(), ["password", "createdAt", "updatedAt", "active"]);

    const myToken = crypto.randomBytes(16).toString("hex");
    const verifyToken = new VerifyToken({ _userId: resUser._id, token: myToken });
    await verifyToken.save();

    await sendEmail("gmail", {
      from: "6GAG | Where the fun begins",
      to: email,
      subject: "Email verification",
      template: "email-verification",
      context: {
        appUrl: "https://localhost:3000/",
        redirect: `https://localhost:3000/verify-user?token=${myToken}`,
        name: resUser.username
      }
    });

    res.status(200).json({ message: "user_created", user: resUser, token });
  } catch (err) {
    next(err);
  }
};

exports.verifyUser = async (req, res, next) => {
  try {
    const { myToken } = req.params;
    const token = await VerifyToken.findOne({ token: myToken });
    if (!token) {
      throw createError("token_expired", 404);
    }

    const user = await User.findById(token._userId);
    if (!user) {
      throw createError("account_not_found", 404);
    }

    user.verified = true;
    await user.save();

    const jwtToken = jwt.sign({ email: user.email, userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "12h" });
    const resUser = omit(user.toObject(), ["password", "createdAt", "updatedAt", "active"]);

    await VerifyToken.deleteMany({ _userId: resUser._id });

    res.status(200).json({ message: "user_verified", user: resUser, token: jwtToken });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user || !user.active) {
      throw createError("account_not_found", 400);
    }
    user.active = false;
    await user.save();
    res.status(200).json({ message: "user_deleted", userId });
  } catch (err) {
    next(err);
  }
};

exports.updateUserInformation = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const userId = req.params.userId;
    const { email, password, avatarURL, birthday } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.active) {
      throw createError("account_not_found", 400);
    }

    user.email = email || user.email;
    user.password = password ? await bcrypt.hash(password, 12) : user.password;
    user.avatarURL = avatarURL || user.avatarURL;
    user.birthday = birthday || user.birthday;

    await user.save();
    res.status(200).json({ message: "user_updated_successfully", userId });
  } catch (err) {
    next(err);
  }
};

exports.requireResetPassword = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const { email } = req.body;

    const user = await User.findOne({ email, active: 1 }).lean();
    if (!user) {
      throw createError("account_not_found", 400);
    }

    await ResetPasswordToken.deleteMany({ _userId: user._id });

    const myToken = crypto.randomBytes(16).toString("hex");
    const token = new ResetPasswordToken({ _userId: user._id, token: myToken });
    await token.save();

    await sendEmail("gmail", {
      from: "6GAG | Where the fun begins",
      to: email,
      subject: "Account Password Reset",
      template: "reset-password",
      context: {
        appUrl: "https://localhost:3000/",
        redirect: `https://localhost:3000/confirm-reset-password?token=${myToken}`,
        name: user.username
      }
    });

    res.status(200).json({ message: "reset_email_sent" });
  } catch (err) {
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const { password, token } = req.body;

    const resTok = await ResetPasswordToken.findOne({ token });
    if (!resTok) {
      throw createError("token_expired", 404);
    }

    const user = await User.findById(resTok._userId);
    if (!user || !user.active) {
      throw createError("account_not_found", 400);
    }

    user.password = await bcrypt.hash(password, 12);
    await user.save();

    await ResetPasswordToken.deleteMany({ _userId: resTok._userId });

    res.status(200).json({ message: "change_password_successfully", userId: resTok._userId });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.active) {
      throw createError("account_not_found", 400);
    }

    const isDefaultPassword = await bcrypt.compare(process.env.DEFAULT_PASSWORD, user.password);
    if (isDefaultPassword) {
      user.password = await bcrypt.hash(newPassword, 12);
      user.isChangePassword = true;
      await user.save();
      return res.status(200).json({ message: "changed_password_the_1st_time_successfully", userId });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw createError("incorrect_password", 400);
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.isChangePassword = true;
    await user.save();
    res.status(200).json({ message: "changed_password_successfully", userId });
  } catch (err) {
    next(err);
  }
};

exports.updateAccount = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const userId = req.userId;
    const { newUsername, newEmail, newMaskNSFW, newShowNSFW } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.active) {
      throw createError("account_not_found", 400);
    }

    user.username = newUsername || user.username;
    user.email = newEmail || user.email;
    user.maskNSFW = newMaskNSFW || user.maskNSFW;
    user.showNSFW = newShowNSFW || user.showNSFW;

    await user.save();
    res.status(200).json({ message: "update_account_successfully", userId });
  } catch (err) {
    next(err);
  }
};

exports.checkUsernameExisted = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const { username } = req.body;
    const user = await User.findOne({ username, active: 1 });
    if (!user) {
      return res.status(200).json({ message: "account_not_found" });
    }
    return res.status(200).json({ message: "account_found" });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    handleValidationErrors(req);
    const userId = req.userId;
    const { avatarUrl, name, status, gender, birthday, country, description } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.active) {
      throw createError("account_not_found", 400);
    }

    user.avatarURL = avatarUrl || user.avatarURL;
    user.name = name || user.name;
    user.statusId = status || user.statusId;
    user.gender = gender || user.gender;
    user.birthday = birthday || user.birthday;
    user.homeCountry = country || user.homeCountry;
    user.description = description || user.description;

    await user.save();
    res.status(200).json({ message: "update_profile_successfully", userId });
  } catch (err) {
    next(err);
  }
};