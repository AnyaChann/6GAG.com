const express = require("express");
const { body } = require("express-validator");

const authController = require("./controller");

const isAuth = require("../../common/middleware/is-auth");

const router = express.Router();

router.post("/", authController.login);
router.post(
  "/social",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .normalizeEmail()
  ],
  authController.loginSocialUser
);

router.get("/", isAuth, authController.getAuthenUser);

module.exports = router;