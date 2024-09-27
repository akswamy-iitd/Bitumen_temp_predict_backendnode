require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const path = require("path");
const router = require("./routes/index.js");
const app = express();
const port = process.env.PORT || 8000;

const allowedOrigins = [
  `${process.env.ADMIN_CLIENT_URL}`, // Admin client URL
  `${process.env.USER_CLIENT_URL}`,   // User client URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware setup
app.use(express.static(path.resolve("./public")));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json());


// Root route
app.get("/", async (req, res) => {
  res.json("You are ready to start");
});

app.use('/api',router);
// Add Routes here
// Don't add any route after this two middlewares

app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
