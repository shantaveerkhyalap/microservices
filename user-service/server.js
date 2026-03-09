require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const { connectDB } = require("../shared/db");
const {
    connectRabbitMQ,
    setupExchange,
    setupQueue,
    subscribeToQueue,
    closeRabbitMQ,
} = require("../shared/rabbitmq");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 3001;
const DB_NAME = process.env.DB_NAME || "users_db";

// ─── Middleware ──────────────────────────────────────────────────────
app.use(express.json());
app.use(morgan("dev"));

// ─── Routes ─────────────────────────────────────────────────────────
app.use("/", userRoutes);

// ─── Health Check ───────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        service: "User Service",
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ─── Initialize Service ─────────────────────────────────────────────
async function startService() {
    try {
        // Connect to MongoDB
        await connectDB(DB_NAME);

        // Setup RabbitMQ exchanges and queues
        await setupExchange("user_exchange", "fanout");
        await setupExchange("order_exchange", "fanout");

        // Subscribe to order events (notify user)
        await setupQueue("order_notification_queue", "order_exchange");
        await subscribeToQueue("order_notification_queue", async (message) => {
            console.log("📬 Received order notification:", message);
            // In production: send email/push notification
            if (message.event === "ORDER_CREATED") {
                console.log(`📧 Notifying user ${message.data.userId} about order ${message.data.orderId}`);
            }
        });

        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n👤 User Service running on http://localhost:${PORT}\n`);
        });
    } catch (error) {
        console.error("❌ Failed to start User Service:", error.message);
        process.exit(1);
    }
}

// ─── Graceful Shutdown ──────────────────────────────────────────────
process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down User Service...");
    await closeRabbitMQ();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await closeRabbitMQ();
    process.exit(0);
});

startService();
