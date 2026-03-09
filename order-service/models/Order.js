const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
    },
    productName: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
});

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: [true, "User ID is required"],
        },
        products: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: (v) => v.length > 0,
                message: "Order must contain at least one product",
            },
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
            default: "pending",
        },
        shippingAddress: {
            street: String,
            city: String,
            state: String,
            zip: String,
            country: { type: String, default: "India" },
        },
        idempotencyKey: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast user-based queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model("Order", orderSchema);
