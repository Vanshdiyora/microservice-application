const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("./models/User");
const connectDB = require("./config/db");
const client = require("prom-client");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Initialize Prometheus metrics
const register = new client.Registry();
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 300, 500, 1000, 3000]  // Adjust buckets based on expected latency
});
register.registerMetric(httpRequestDurationMicroseconds);
client.collectDefaultMetrics({ register });

// Monitoring endpoint for Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Signup endpoint
app.post("/api/signup", async (req, res) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      end({ route: "/api/signup", method: req.method, status_code: 400 });
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    end({ route: "/api/signup", method: req.method, status_code: 201 });
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    end({ route: "/api/signup", method: req.method, status_code: 500 });
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Signup Service running on port ${PORT}`));
