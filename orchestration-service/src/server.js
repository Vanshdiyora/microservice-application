// orchestration-service/src/server.js
const express = require('express');
const { consumeMessages } = require('./queueConsumer');

const app = express();
const PORT = 5005;

app.use(express.json());

// Start consuming messages for orchestration
consumeMessages();

app.listen(PORT, () => {
  console.log(`Orchestration service running on port ${PORT}`);
});
