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
  buckets: [50, 100, 300, 500, 1000, 3000],  // Adjust buckets based on expected latency
});
register.registerMetric(httpRequestDurationMicroseconds);
client.collectDefaultMetrics({ register });

// Monitoring endpoint for Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      end({ route: "/api/login", method: req.method, status_code: 401 });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      end({ route: "/api/login", method: req.method, status_code: 401 });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    end({ route: "/api/login", method: req.method, status_code: 200 });
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    end({ route: "/api/login", method: req.method, status_code: 500 });
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5003; // Change the port if necessary
app.listen(PORT, () => console.log(`Login Service running on port ${PORT}`));
