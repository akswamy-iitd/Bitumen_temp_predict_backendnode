const jwt = require("jsonwebtoken");
const User = require("../models/user");
require("dotenv").config();
const requestIp = require("request-ip");
const useragent = require("express-useragent");
const geoip = require("geoip-lite");
const bcrypt = require("bcrypt");

const UserController = {}; 
const secret = process.env.JWT_SECRET;

UserController.userCheck = (req, res) => {

  const token = req.cookies.token; 

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    return res.status(200).json({ message: "Token is valid", user: decoded });
  } catch (error) {
    console.error("Token verification failed: ", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};


UserController.signin = async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // Retrieve IP address and device information
    const clientIp = requestIp.getClientIp(req);
    const deviceInfo = req.useragent || {}; // Ensure you have this middleware set up
    const locationInfo = geoip.lookup(clientIp) || {};

    console.log('Login History Entry:', {
      ip: clientIp,
      device: {
          type: deviceInfo?.type || 'Unknown',
          os: deviceInfo?.os || 'Unknown',
          platform: deviceInfo?.platform || 'Unknown',
      },
      location: {
          type: locationInfo?.type || 'Unknown',
          city: locationInfo?.city || 'Unknown',
          region: locationInfo?.region || 'Unknown',
          country: locationInfo?.country || 'Unknown',
      },
      logintime: new Date(),
  });
  
    // Call matchPasswordAndGenerateToken with necessary parameters
    const { token } = await User.matchPasswordAndGenerateToken(email, password, clientIp, deviceInfo, locationInfo);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
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

// Get Profile Route
UserController.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password -salt");
    if (user) {
      res.json(user);
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(404).json({ error: "User not found" });
  }
};



// Logout Route
// UserController.logout = (req, res, next) => {
//   try {
//     res.clearCookie("token", { path: "/", sameSite: "None", secure: true });
//     res.status(200).json({ message: "You are logged out" });
//   } catch (error) {
//     return res.status(404).json({ error: "User not found" });
//   }
// };
UserController.signup = async (req, res, next) => {
  const { fullName, email, password } = req.body;

  // Validate input
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "All fields (fullName, email, password) are required" });
  }

  // Optionally, add email format validation here

  try {
    // Use the User model's signup function
    const user = await User.signup(fullName, email, password);

    // Respond with success message
    res.status(201).json({ message: "User is created", user });
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle specific errors if needed (e.g., if the user already exists)
    if (error.message.includes("User already exists")) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // General error fallback
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// Dashboard Route
UserController.dashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const userData = await User.findById(
      user._id,
      "creditleft creditused role"
    );

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
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
    return res.status(404).json({ error: "User not found" });
  }
};

// Find Data Route
UserController.finddata = async (req, res, next) => {
  try {
    const user = req.user;
    const userData = await User.findById(user._id);

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userData.creditleft <= 0) {
      return res.status(400).json({ error: "Insufficient credits" });
    }

    const { lat, lon, altitude, elevation, category } = req.body;
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
        category,
      }),
    });

    const contentType = backendResponse.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      userData.creditleft -= 1;
      userData.creditused += 1;

      await userData.save();
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
      return res.status(500).json({ error: "Failed to process data" });
    }
  } catch (error) {
    console.error("Error processing /dashboard/find:", error);
    return res.status(500).json({ error: "Failed to process data" });
  }
};

UserController.predict = async (req, res) => {
  const { lat, lon, altitude, category } = req.body;
  try {
    const user = req.user;

    const userData = await mongoose.model("User").findById(user.id);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    if ( userData.creditleft <= 0) {
      return res.status(400).json({ error: "Insufficient credits" });
    }

      userData.creditleft -= 1;
      userData.creditused += 1;

  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

  try {
    const backendResponse = await fetch(
      `${process.env.FLASK_API_URL}/predict`,
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
          category,
        }),
      }
    );

    // Check if the response is okay (status code 200-299)
    if (!backendResponse.ok) {
      throw  Error(
        `Error: ${backendResponse.status} ${backendResponse.statusText}`
      );
    }

    const data = await backendResponse.json();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch data from Flask API:", error);
  }
  } catch (error) {
    console.error("Error processing prediction:", error);
    return res.status(500).json({ error: "Failed to process prediction" });
  }
};
module.exports = UserController;
