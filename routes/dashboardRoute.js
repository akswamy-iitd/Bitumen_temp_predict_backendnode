const express = require('express');
const mongoose = require('mongoose');
const { InternalServerError } = require('../errors/index.js');
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const user = req.user;

    const userData = await mongoose
      .model("User")
      .findById(user._id, "creditleft creditused role");
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userData.role === "ADMIN") {
      res.json({
        creditused: userData.creditused,
      });
    } else {
      res.json({
        creditleft: userData.creditleft,
        creditused: userData.creditused,
      });
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(new InternalServerError().statusCode).json({ error: 'Internal Server Error' });
  }
});

router.post("/find", async (req, res) => {
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

    await userData.save();

    const { lat, lon, altitude, elevation, accuracy, category, tempType } = req.body;
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const backendResponse = await fetch(`http://127.0.0.1:9001/predict`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.FLASK_SECRET_CODE,
      },
      body: JSON.stringify({
        lat,
        lon,
        altitude,
        elevation,
        accuracy,
        category,
        tempType, // Send tempType to the Flask backend
      }),
    });

    const contentType = backendResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await backendResponse.json();
      const { min_temp, max_temp } = data; // Adjust to handle both min and max temperatures
      console.log(min_temp, max_temp);
      res.json({
        success: true,
        message: "Data processed successfully",
        creditleft: userData.role !== "ADMIN" ? userData.creditleft : undefined,
        creditused: userData.creditused,
        minTemperature: min_temp, // Return the minimum temperature
        maxTemperature: max_temp, // Return the maximum temperature
      });
    } else {
      const responseText = await backendResponse.text();
      console.error("Unexpected response format:", responseText);
      res.status(500).json({ error: "Failed to process data" });
    }
  } catch (error) {
    console.error("Error processing /dashboard/find:", error);
    res.status(new InternalServerError().statusCode).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
