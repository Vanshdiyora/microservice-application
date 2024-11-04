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

// Signup endpoint
app.post("/api/signup", async (req, res) => {
    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        const savedUser = await user.save();

        // Publish signup event to orchestration_queue
        if (savedUser) {
            await publishMessage("orchestration_queue", { type: "signup", email });
            console.log("User registered and message sent to orchestration service.");
            res.status(201).send("User registered successfully");
        } else {
            res.status(500).send("Failed to register user");
        }
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(400).send("Error registering user");
    }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Signup service running on port ${PORT}`);
});
