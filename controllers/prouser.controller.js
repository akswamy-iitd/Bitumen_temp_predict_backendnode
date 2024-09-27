const mongoose = require("mongoose");
const User = require("../models/user");
const { decode } = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

require("dotenv").config();

const ProUserController = {};

ProUserController.proUserCheck = (req, res) => {
  const token = req.cookies.token; 

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    console.log(decoded);
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};



ProUserController.signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    console.log("Email:", email);
    const token = await User.matchPasswordAndGenrateToken(email, password);
    console.log("Token:", token);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.cookie("token", token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      // sameSite: "None",
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
    console.error("Error signing in user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
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
    res.status(404).json({ error: "User not found" });
  }
};

ProUserController.logout = (req, res, next) => {
  try {
    res.clearCookie("token", { path: "/", sameSite: "None", secure: true });
    res.status(200).json({ message: "You are logged out" });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

ProUserController.signup = async (req, res, next) => {
  const { fullName, email, password, secretCode } = req.body;
  try {
    if (!fullName || !email || !password || !secretCode) {
      return res.status(404).json({ error: "User not found" }); 
    } 

    await User.signup(fullName, email, password, secretCode);
    res.json("User is created");
  } catch (error) {
    console.error("Error creating user:", error);
    return next(
  
      res.status(500).json({ error: "Internal Server Error" })  
      );
  }
};




ProUserController.predict = async (req, res) => {
  const { lat, lon, altitude } = req.body;
  console.log("Request body:", req.body);
  try {
    const userData = await User.findById(req.user.id);
    console.log(userData)
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userData.creditleft <= 0) {
      return res.status(400).json({ error: "Insufficient credits" });
    }

      userData.creditleft -= 1;
      userData.creditused += 1;
      await userData.save();

  } catch (error) {
    console.error("Error processing /dashboard/find:", error);
    res.status(500).json({ error: "Failed to process data" });
  }
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

  try {
    
    const backendResponse = await fetch(
      `${process.env.Flask_BACKEND_URL}/predict/composite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${process.env.FLASK_SECRET_CODE}`,
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
      throw Error(
        `Error: ${backendResponse.status} ${backendResponse.statusText}`
      );
    }

    const data = await backendResponse.json();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch data from Flask API:", error);
  }
};

module.exports = ProUserController;
