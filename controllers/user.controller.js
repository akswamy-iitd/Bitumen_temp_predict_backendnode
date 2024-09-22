const User = require("../models/user");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  InternalServerError,
} = require("../errors");

require("dotenv").config();

const UserController = {}; // Define the UserController object

// Signin Route
UserController.signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return next(NotFoundError("User not found"));
    }

    const token = await User.matchPasswordAndGenrateToken(email, password);

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
    console.error("Error signing in user:", error);
    return next(UnauthorizedError("Incorrect Email or Password"));
  }
};

// Get Profile Route
UserController.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json(user);
    } else {
      return next(InternalServerError("Not able to find User"));
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return next(InternalServerError("Error fetching profile"));
  }
};

// Logout Route
UserController.logout = (req, res, next) => {
  try {
    res.clearCookie("token", { path: "/", sameSite: "None", secure: true });
    res.status(200).json({ message: "You are logged out" });
  } catch (error) {
    return next(InternalServerError("Logout failed"));
  }
};

// Signup Route
UserController.signup = async (req, res, next) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return next(BadRequestError("Missing required fields"));
    }

    await User.signup(fullName, email, password);
    res.json("User is created");
  } catch (error) {
    console.error("Error creating user:", error);
    return next(InternalServerError("Server error || duplicate data"));
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

// Find Data Route
UserController.finddata = async (req, res, next) => {
  try {
    const user = req.user;
    const userData = await User.findById(user._id);

    if (!userData) {
      return next(NotFoundError("User not found"));
    }

    if (userData.creditleft <= 0) {
      return next(BadRequestError("Insufficient credits"));
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
      return next(InternalServerError("Failed to process data"));
    }
  } catch (error) {
    console.error("Error processing /dashboard/find:", error);
    return next(InternalServerError());
  }
};

UserController.predict = async (req, res) => {
  const { lat, lon, altitude, category } = req.body;
  try {
    const user = req.user;

    const userData = await mongoose.model("User").findById(user._id);
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
      `http://10.184.19.231:9001/predict/composite`,
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
      throw new Error(
        `Error: ${backendResponse.status} ${backendResponse.statusText}`
      );
    }

    const data = await backendResponse.json();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch data from Flask API:", error);
  }
};
module.exports = UserController;
