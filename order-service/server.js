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
const Order = require("./models/Order");
const orderRoutes = require("./routes/orderRoutes");

const app = express();
const PORT = process.env.PORT || 3003;
const DB_NAME = process.env.DB_NAME;

// ─── Middleware ──────────────────────────────────────────────────────
app.use(express.json());
app.use(morgan("dev"));

// ─── Utility Routes ──────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        service: "Order Service",
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

// ─── Routes ─────────────────────────────────────────────────────────
app.use("/", orderRoutes);

// ─── Initialize Service ─────────────────────────────────────────────
async function startService() {
    try {
        // Connect to MongoDB
        const mongoose = require("mongoose");
        await connectDB(mongoose, DB_NAME);

        // Setup RabbitMQ exchanges
        await setupExchange("order_exchange", "fanout");
        await setupExchange("product_exchange", "fanout");

        // Subscribe to PRODUCT_UPDATED → update embedded product info in orders
        await setupQueue("product_updated_queue", "product_exchange");
        await subscribeToQueue("product_updated_queue", async (message) => {
            if (message.event === "PRODUCT_UPDATED") {
                console.log("Product update received:", message.data.productId);

                // Update product info in pending orders
                await Order.updateMany(
                    {
                        "products.productId": message.data.productId,
                        status: { $in: ["pending", "confirmed"] },
                    },
                    {
                        $set: {
                            "products.$[elem].productName": message.data.name,
                            "products.$[elem].price": message.data.price,
                        },
                    },
                    {
                        arrayFilters: [{ "elem.productId": message.data.productId }],
                    }
                );

                console.log(`Updated orders with product: ${message.data.productId}`);
            }
        });

        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n🛒 Order Service running on http://localhost:${PORT}\n`);
        });
    } catch (error) {
        console.error("❌ Failed to start Order Service:", error.message);
        process.exit(1);
    }
}

// ─── Graceful Shutdown ──────────────────────────────────────────────
process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down Order Service...");
    await closeRabbitMQ();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await closeRabbitMQ();
    process.exit(0);
});

startService();
