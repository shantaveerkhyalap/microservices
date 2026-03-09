const amqp = require("amqplib");

let connection = null;
let channel = null;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

// ─── Connection Manager with Auto-Reconnect ──────────────────────────
async function connectRabbitMQ() {
  try {
    if (connection && channel) return channel;

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Fair dispatch — one message at a time per consumer
    await channel.prefetch(1);

    console.log("✅ RabbitMQ connected successfully");

    // Auto-reconnect on connection close
    connection.on("close", () => {
      console.log("⚠️  RabbitMQ connection closed. Reconnecting in 5s...");
      connection = null;
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on("error", (err) => {
      console.error("❌ RabbitMQ connection error:", err.message);
      connection = null;
      channel = null;
    });

    return channel;
  } catch (error) {
    console.error("❌ Failed to connect to RabbitMQ:", error.message);
    console.log("🔄 Retrying RabbitMQ connection in 5s...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectRabbitMQ();
  }
}

// ─── Setup Exchange + Queue with Dead Letter Queue ───────────────────
async function setupExchange(exchangeName, exchangeType = "fanout") {
  const ch = await connectRabbitMQ();
  // Durable exchange survives RabbitMQ restarts
  await ch.assertExchange(exchangeName, exchangeType, { durable: true });

  // Dead Letter Exchange for failed messages
  const dlxExchange = `${exchangeName}_dlx`;
  await ch.assertExchange(dlxExchange, "fanout", { durable: true });

  return ch;
}

async function setupQueue(queueName, exchangeName, routingKey = "") {
  const ch = await connectRabbitMQ();
  const dlxExchange = `${exchangeName}_dlx`;
  const dlqName = `${queueName}_dlq`;

  // Main queue with DLQ routing on rejection
  await ch.assertQueue(queueName, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": dlxExchange,
      "x-dead-letter-routing-key": dlqName,
      "x-message-ttl": 86400000, // 24h TTL for unprocessed messages
    },
  });

  // Dead Letter Queue — stores failed messages for inspection
  await ch.assertQueue(dlqName, { durable: true });
  await ch.bindQueue(dlqName, dlxExchange, dlqName);

  // Bind main queue to exchange
  await ch.bindQueue(queueName, exchangeName, routingKey);

  console.log(`📦 Queue "${queueName}" bound to exchange "${exchangeName}"`);
  return ch;
}

// ─── Publish Message (Persistent) ────────────────────────────────────
async function publishMessage(exchangeName, routingKey, message) {
  try {
    const ch = await connectRabbitMQ();
    const messageBuffer = Buffer.from(JSON.stringify(message));

    ch.publish(exchangeName, routingKey, messageBuffer, {
      persistent: true, // deliveryMode: 2 — survives RabbitMQ restarts
      contentType: "application/json",
      timestamp: Date.now(),
    });

    console.log(`📤 Published to "${exchangeName}":`, message);
    return true;
  } catch (error) {
    console.error("❌ Failed to publish message:", error.message);
    return false;
  }
}

// ─── Subscribe to Queue (Manual ACK + Retry Logic) ───────────────────
async function subscribeToQueue(queueName, callback, maxRetries = 3) {
  try {
    const ch = await connectRabbitMQ();

    console.log(`👂 Listening on queue "${queueName}"...`);

    ch.consume(
      queueName,
      async (msg) => {
        if (!msg) return;

        const retryCount = (msg.properties.headers && msg.properties.headers["x-retry-count"]) || 0;

        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content, msg);

          // ✅ Acknowledge — message processed successfully
          ch.ack(msg);
          console.log(`✅ Processed message from "${queueName}"`);
        } catch (error) {
          console.error(`❌ Error processing message from "${queueName}":`, error.message);

          if (retryCount < maxRetries) {
            // Retry: republish with incremented retry count
            console.log(`🔄 Retrying (${retryCount + 1}/${maxRetries})...`);
            ch.ack(msg); // Ack the original

            const exchange = msg.fields.exchange;
            const routingKey = msg.fields.routingKey;
            ch.publish(exchange, routingKey, msg.content, {
              persistent: true,
              headers: { "x-retry-count": retryCount + 1 },
            });
          } else {
            // Max retries exceeded → reject to DLQ
            console.log(`💀 Max retries exceeded. Sending to DLQ.`);
            ch.nack(msg, false, false); // Send to Dead Letter Queue
          }
        }
      },
      { noAck: false } // Manual acknowledgment
    );
  } catch (error) {
    console.error("❌ Failed to subscribe:", error.message);
    setTimeout(() => subscribeToQueue(queueName, callback, maxRetries), 5000);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────
async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log("🔌 RabbitMQ connection closed gracefully");
  } catch (error) {
    console.error("Error closing RabbitMQ:", error.message);
  }
}

module.exports = {
  connectRabbitMQ,
  setupExchange,
  setupQueue,
  publishMessage,
  subscribeToQueue,
  closeRabbitMQ,
};
