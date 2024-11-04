const amqp = require('amqplib/callback_api');
const { performWorkflowAction } = require('./orchestrationController');

function consumeMessages() {
    amqp.connect(process.env.RABBITMQ_URL, (error0, connection) => {
        if (error0) {
            console.error("Failed to connect to RabbitMQ, retrying in 5 seconds...");
            setTimeout(consumeMessages, 5000); // Retry after 5 seconds
            return;
        }

        connection.createChannel((error1, channel) => {
            if (error1) throw error1;

            const queue = 'orchestration_queue';
            channel.assertQueue(queue, { durable: true });
            console.log("Waiting for messages in %s", queue);

            channel.consume(queue, (msg) => {
                const data = JSON.parse(msg.content.toString());
                performWorkflowAction(data);
                channel.ack(msg);  // Acknowledge message once processed
            });
        });
    });
}

module.exports = { consumeMessages };
