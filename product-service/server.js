const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
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
const Product = require("./models/Product");
const productRoutes = require("./routes/productRoutes");

const app = express();
const PORT = process.env.PORT || 3002;
const DB_NAME = process.env.DB_NAME;

// ─── Middleware ──────────────────────────────────────────────────────
app.use(express.json());
app.use(morgan("dev"));

// ─── Utility Routes ──────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        service: "Product Service",
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

// ─── Routes ─────────────────────────────────────────────────────────
app.use("/", productRoutes);

// ─── Initialize Service ─────────────────────────────────────────────
async function startService() {
    try {
        // Connect to MongoDB
        const mongoose = require("mongoose");
        await connectDB(mongoose, DB_NAME);

        // Setup RabbitMQ exchanges
        await setupExchange("product_exchange", "fanout");
        await setupExchange("order_exchange", "fanout");

        // Subscribe to ORDER_CREATED → decrement stock
        await setupQueue("order_created_queue", "order_exchange");
        await subscribeToQueue("order_created_queue", async (message) => {
            if (message.event === "ORDER_CREATED") {
                console.log("📦 Processing stock update for order:", message.data.orderId);

                for (const item of message.data.products) {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        product.stock = Math.max(0, product.stock - item.quantity);
                        await product.save();

                        console.log(
                            `📉 Stock updated: ${product.name} → ${product.stock} remaining`
                        );
                    }
                }
            }
        });

        // Subscribe to USER_REGISTERED (optional: log new users)
        await setupQueue("user_registered_queue", "user_exchange");
        await subscribeToQueue("user_registered_queue", async (message) => {
            if (message.event === "USER_REGISTERED") {
                console.log(`🎉 New user registered: ${message.data.name} (${message.data.email})`);
            }
        });

        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n📦 Product Service running on http://localhost:${PORT}\n`);
        });
    } catch (error) {
        console.error("❌ Failed to start Product Service:", error.message);
        process.exit(1);
    }
}

// ─── Graceful Shutdown ──────────────────────────────────────────────
process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down Product Service...");
    await closeRabbitMQ();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await closeRabbitMQ();
    process.exit(0);
});

startService();
