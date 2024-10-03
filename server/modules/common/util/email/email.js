const nodemailer = require("nodemailer");
const path = require("path");
require('dotenv').config();

const gmailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

(async () => {
  const hbs = await import("nodemailer-express-handlebars");

  gmailTransporter.use(
    "compile",
    hbs.default({
      viewPath: path.join(__dirname, "./templates"),
      extName: ".hbs",
      viewEngine: {
        extName: ".hbs",
        partialsDir: path.join(__dirname, "./templates/partials"),
        defaultLayout: false
      }
    })
  );
})();

const emailServices = {
  gmail: gmailTransporter
};

const sendEmail = (service, options) => {
  let transporter = emailServices[service];
  return transporter.sendMail(options);
};

module.exports = {
  sendEmail
};