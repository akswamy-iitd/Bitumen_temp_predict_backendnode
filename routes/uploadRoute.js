const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { isPointInIndia, parseCoordinates } = require("../services/indiaBoundary.js");
require("dotenv").config();

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Dynamic import of fetch
let fetch;
(async () => {
  fetch = (await import("node-fetch")).default;
})();

// All models you want in your CSV
const MODELS = [
  "composite",
  "extreme",
  "generalized",
  "kernel",
  "logistic",
  "normal",
  "scale",
];

// Percentage labels (21 columns each for min and max)
const PERCENTAGES = [
  "1%", "5%", "10%", "15%", "20%", "25%",
  "30%", "35%", "40%", "45%", "50%", "55%",
  "60%", "65%", "70%", "75%", "80%", "85%",
  "90%", "95%", "99%",
];

// Build the CSV header
function buildHeader() {
  // Only latitude, longitude, altitude for the base columns
  const baseHeader = ["latitude", "longitude", "altitude"];

  // For each model, add 44 columns: 1 placeholder + 21 min temps, 1 placeholder + 21 max temps
  MODELS.forEach((model) => {
    baseHeader.push(
      model + "_min_temps",
      ...PERCENTAGES,
      model + "_max_temps",
      ...PERCENTAGES
    );
  });

  return baseHeader;
}

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const userData = await mongoose.model("User").findById(user.id);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        const requiredCredits = results.length;
        if (userData.creditleft < requiredCredits) {
          return res.status(400).json({ error: "Insufficient credits" });
        }

        for (let index = 0; index < results.length; index += 1) {
          const row = results[index];
          const coordinates = parseCoordinates(row.latitude, row.longitude);
          if (!coordinates || !(await isPointInIndia(coordinates.lat, coordinates.lon))) {
            return res.status(400).json({
              error: `Row ${index + 2} has coordinates outside India or invalid coordinates`,
            });
          }
        }

        const processedData = [];

        // Fetch predictions for each CSV row
        for (const row of results) {
          const { latitude = "0", longitude = "0", altitude = "0" } = row;

          try {
            const backendResponse = await fetch(
              `${process.env.Flask_BACKEND_URL}/predictWithCompoite`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: process.env.FLASK_SECRET_CODE,
                },
                body: JSON.stringify({
                  lat: parseFloat(latitude),
                  lon: parseFloat(longitude),
                  altitude: parseFloat(altitude),
                }),
              }
            );

            if (!backendResponse.ok) {
              const errorText = await backendResponse.text();
              console.error(
                `API responded with status ${backendResponse.status}: ${errorText}`
              );
              throw new Error(`API responded with status ${backendResponse.status}`);
            }

            const data = await backendResponse.json();

            // Convert the returned object into an array of {model, min_temp, max_temp}
            const predicted_temp = Object.entries(data).map(([model, temps]) => ({
              model,
              max_temp: temps.max_temp || [],
              min_temp: temps.min_temp || [],
            }));

            // Deduct credits if not ADMIN
            if (userData.role !== "ADMIN") {
              userData.creditleft -= 1;
              userData.creditused += 1;
              if (userData.creditleft < 0) {
                return res
                  .status(400)
                  .json({ error: "Credits went below zero" });
              }
            } else {
              userData.creditused += 1;
            }
            await userData.save();

            processedData.push({
              ...row,
              predicted_temp,
            });
          } catch (error) {
            console.error(`Error fetching data for row: ${JSON.stringify(row)}`, error);
            return res.status(500).json({ error: "Error processing row" });
          }
        }

        // Build CSV
        const header = buildHeader();
        const csvRows = [header.join(",")];

        // For each row, create a wide row with all models' data
        for (const row of processedData) {
          // Make a map from model name -> {min_temp, max_temp}
          const modelMap = {};
          for (const item of row.predicted_temp) {
            modelMap[item.model] = item;
          }

          // Start with base columns: latitude, longitude, altitude
          const rowArray = [
            row.latitude,
            row.longitude,
            row.altitude,
          ];

          // For each model, add 44 columns
          MODELS.forEach((model) => {
            const item = modelMap[model] || { min_temp: [], max_temp: [] };

            // Ensure each array is length 21
            const minArr = [...item.min_temp];
            const maxArr = [...item.max_temp];
            while (minArr.length < 21) minArr.push("");
            while (maxArr.length < 21) maxArr.push("");

            // Insert a placeholder for min, then minArr, then placeholder for max, then maxArr
            rowArray.push(
              "",        // model + \"_min_temps\" label, or blank
              ...minArr,
              "",        // model + \"_max_temps\" label, or blank
              ...maxArr
            );
          });

          csvRows.push(rowArray.join(","));
        }

        const csvData = csvRows.join("\n");

        // Send CSV for download
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=all_models.csv");
        res.status(200).send(csvData);

        // Cleanup the uploaded file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error(`Failed to delete temp file: ${err}`);
        });
      });
  } catch (error) {
    console.error("Error processing /upload:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
