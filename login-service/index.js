const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("./models/User");
const amqp = require("amqplib");
const client = require("prom-client");

dotenv.config();
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Define a /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Publish message to RabbitMQ
async function publishMessage(queue, message) {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(queue);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    console.log("Message sent to queue:", message);
    await channel.close();
    await connection.close();
}

// Login endpoint
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send("Invalid credentials");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send("Invalid credentials");
        }

        // Publish login event to orchestration_queue
        await publishMessage("orchestration_queue", { type: "login", email });
        console.log("User login successful and message sent to orchestration service.");

        res.send("Login successful");
    } catch (error) {
        res.status(500).send("Server error");
    }
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Login service running on port ${PORT}`);
});
