require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const path = require("path");
const router = require("./routes/index.js");
const useragent = require("express-useragent");
const session = require("express-session");
const passport = require("passport");

const app = express();
const port = process.env.PORT || 8000;

// CORS middleware
app.use(
  cors({
    origin: true, // Automatically reflects the request origin
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allows sending cookies with cross-origin requests
  })
);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware setup
app.use(express.static(path.resolve("./public")));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json());
app.use(useragent.express());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production", 
    httpOnly: true,
    sameSite: 'None'
  }
}));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Root route
app.get("/", async (req, res) => {
  res.json("You are ready to start");
});

// API routes
app.use('/api', router);

// Start the server
app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
