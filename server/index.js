require("dotenv").config({ path: "./env/dev.env" });

const path = require("path");
const fs = require("fs");
const https = require("https");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");

const authRoutes = require("./modules/api/auth/router");
const userRoutes = require("./modules/api/users/router");
const postRoutes = require("./modules/api/posts/router");
const categoryRoutes = require("./modules/api/category/router");
const countryRoutes = require("./modules/api/country/router");
const statusRoutes = require("./modules/api/status/router");
const utilRoutes = require("./modules/api/util/router");

const { fileFilter, fileStorage } = require("./modules/common/util/multer-util");

const app = express();

app.use(bodyParser.json());

// Use the CORS middleware
app.use(cors());

// Static folder Middleware
app.use("/images", express.static(path.join(__dirname, "/uploads/images")));
app.use("/assets", express.static(path.join(__dirname, "/uploads/assets")));
app.use(
  "/comment-images",
  express.static(path.join(__dirname, "/uploads/comments-images"))
);

// Multer (file upload) middleware
app.use(
  "/api",
  multer({
    fileFilter: fileFilter
  }).single("file")
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/util", utilRoutes);

// Error-handling Middleware
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({
    message: message,
    data: data
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(result => {
    const port = process.env.PORT;
    console.warn("Listening at port:", port);
    https
      .createServer(
        {
          key: fs.readFileSync(
            `./modules/common/keys/${process.env.NODE_ENV}/${process.env.SSL_KEY_NAME}`
          ),
          cert: fs.readFileSync(
            `./modules/common/keys/${process.env.NODE_ENV}/${process.env.SSL_CRT_NAME}`
          ),
          requestCert: false,
          rejectUnauthorized: false
        },
        app
      )
      .listen(port);
  })
  .catch(err => console.log(err));