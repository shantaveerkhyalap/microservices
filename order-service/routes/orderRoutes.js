const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { publishMessage } = require("../../shared/rabbitmq");

// ─── POST / — Create order ──────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { products, shippingAddress } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "User ID required" });
        }

        if (!products || products.length === 0) {
            return res.status(400).json({ error: "At least one product is required" });
        }

        // Calculate total
        const totalAmount = products.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const order = await Order.create({
            userId,
            products,
            totalAmount,
            shippingAddress,
        });

        // ─── Publish ORDER_CREATED to RabbitMQ ────────────────────────
        // Even if Product Service is DOWN, this message is persisted
        // in the durable queue and processed when service comes back up!
        await publishMessage("order_exchange", "", {
            event: "ORDER_CREATED",
            data: {
                orderId: order._id,
                userId: order.userId,
                products: order.products,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt,
            },
        });

        console.log(`📤 ORDER_CREATED event published for order: ${order._id}`);

        res.status(201).json({ message: "Order created successfully", order });
    } catch (error) {
        console.error("Create order error:", error.message);
        res.status(500).json({ error: "Failed to create order" });
    }
});

// ─── GET / — List orders for user ───────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (userId) query.userId = userId;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [orders, total] = await Promise.all([
            Order.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
            Order.countDocuments(query),
        ]);

        res.json({
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("List orders error:", error.message);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// ─── GET /:id — Get order by ID ─────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.json({ order });
    } catch (error) {
        console.error("Get order error:", error.message);
        res.status(500).json({ error: "Failed to fetch order" });
    }
});

// ─── PUT /:id/status — Update order status ──────────────────────────
router.put("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Publish order status update event
        await publishMessage("order_exchange", "", {
            event: "ORDER_STATUS_UPDATED",
            data: {
                orderId: order._id,
                userId: order.userId,
                status: order.status,
                updatedAt: new Date(),
            },
        });

        res.json({ message: "Order status updated", order });
    } catch (error) {
        console.error("Update order status error:", error.message);
        res.status(500).json({ error: "Failed to update order status" });
    }
});

module.exports = router;
