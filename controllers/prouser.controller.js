const mongoose = require("mongoose");
const User = require("../models/user");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  InternalServerError,
} = require("../errors");

require("dotenv").config();

const ProUserController = {};

// Signin Route
ProUserController.signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    console.log("Email:", email);
    const token = await User.matchPasswordAndGenrateToken(email, password);
    console.log("Token:", token);
    const user = await User.findOne({ email });
    if (!user) {
      return next(NotFoundError("User not found"));
    }

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.json({
      message: "Login successful",
      user: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(UnauthorizedError("Incorrect Email or Password"));
  }
};
ProUserController.getProfile = async (req, res) => {
  const user = await User.findById(req.user?.id).select(
    "userId fullName email creditleft creditused role"
  );

  if (user) {
    const userData = {
      userId: user.userId,
      name: user.fullName,
      email: user.email,
      creditleft: user.creditleft,
      creditused: user.creditused,
      role: user.role,
    };

    res.json(userData);
  } else {
    InternalServerError("Not able to find User");
  }
};

ProUserController.logout = (req, res, next) => {
  try {
    res.clearCookie("token", { path: "/", sameSite: "None", secure: true });
    res.status(200).json({ message: "You are logged out" });
  } catch (error) {
    return next(InternalServerError("Logout failed"));
  }
};

ProUserController.signup = async (req, res, next) => {
  const { fullName, email, password, secretCode } = req.body;
  try {
    if (!fullName || !email || !password || !secretCode) {
      return next(BadRequestError("Missing required fields"));
    }

    await User.signup(fullName, email, password, secretCode);
    res.json("User is created");
  } catch (error) {
    console.error("Error creating user:", error);
    return next(
      InternalServerError("Server error || duplicate data || wrong code")
    );
  }
};

ProUserController.dashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const userData = await mongoose
      .model("User")
      .findById(user._id, "creditleft creditused role");

    if (!userData) {
      return next(NotFoundError("User not found"));
    }

    if (userData.role === "ADMIN") {
      res.json({ creditused: userData.creditused });
    } else {
      res.json({
        creditleft: userData.creditleft,
        creditused: userData.creditused,
      });
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return next(InternalServerError());
  }
};

ProUserController.find = async (req, res, next) => {
  try {
    const user = req.user;
    const userData = await mongoose.model("User").findById(user._id);

    if (!userData) {
      return next(NotFoundError("User not found"));
    }

    if (userData.role !== "ADMIN" && userData.creditleft <= 0) {
      return next(BadRequestError("Insufficient credits"));
    }

    if (userData.role !== "ADMIN") {
      userData.creditleft -= 1;
      userData.creditused += 1;
    } else {
      userData.creditused += 1;
    }

    await userData.save();

    const { lat, lon, altitude, elevation, accuracy, category, tempType } =
      req.body;
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));

    const backendResponse = await fetch(`http://127.0.0.1:9001/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.FLASK_SECRET_CODE,
      },
      body: JSON.stringify({
        lat,
        lon,
        altitude,
        elevation,
        accuracy,
        category,
        tempType,
      }),
    });

    const contentType = backendResponse.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await backendResponse.json();
      const { min_temp, max_temp } = data;

      res.json({
        success: true,
        message: "Data processed successfully",
        creditleft: userData.role !== "ADMIN" ? userData.creditleft : undefined,
        creditused: userData.creditused,
        minTemperature: min_temp,
        maxTemperature: max_temp,
      });
    } else {
      const responseText = await backendResponse.text();
      console.error("Unexpected response format:", responseText);
      return next(InternalServerError("Failed to process data"));
    }
  } catch (error) {
    console.error("Error processing /dashboard/find:", error);
    return next(InternalServerError());
  }
};
ProUserController.predict = async (req, res) => {
  const { lat, lon, altitude } = req.body;
  console.log("Request body:", req.body);
  try {
    const userData = await User.findById(req.user.id);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userData.role !== "ADMIN" && userData.creditleft <= 0) {
      return res.status(400).json({ error: "Insufficient credits" });
    }

    if (userData.role !== "ADMIN") {
      userData.creditleft -= 1;
      userData.creditused += 1;
    } else {
      userData.creditused += 1;
    }
  } catch (error) {
    console.error("Error processing /dashboard/find:", error);
    res.status(500).json({ error: "Failed to process data" });
  }
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

  try {
    const backendResponse = await fetch(
      ` http://127.0.0.1:9001/predict/composite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.FLASK_SECRET_CODE,
        },
        body: JSON.stringify({
          lat,
          lon,
          altitude,
        }),
      }
    );

    // Check if the response is okay (status code 200-299)
    if (!backendResponse.ok) {
      throw new Error(
        `Error: ${backendResponse.status} ${backendResponse.statusText}`
      );
    }

    const data = await backendResponse.json();
    console.log("Data from Flask API:", data);
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch data from Flask API:", error);
  }
};
module.exports = ProUserController;
