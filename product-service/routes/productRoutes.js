const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { publishMessage } = require("../../shared/rabbitmq");

// ─── GET / — List all products ──────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const { category, search, page = 1, limit = 20 } = req.query;

        // Build query
        const query = { isActive: true };
        if (category) query.category = category;
        if (search) query.$text = { $search: search };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, total] = await Promise.all([
            Product.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
            Product.countDocuments(query),
        ]);

        const result = {
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        };

        res.json(result);
    } catch (error) {
        console.error("List products error:", error.message);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

const mongoose = require("mongoose");

// ─── GET /:id — Get single product ──────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid product ID format" });
        }
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json({ product });
    } catch (error) {
        console.error("Get product error:", error.message);
        res.status(500).json({ error: "Failed to fetch product" });
    }
});

// ─── POST / — Create product ────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const { name, description, price, stock, category } = req.body;
        const product = await Product.create({ name, description, price, stock, category });

        // Publish PRODUCT_UPDATED event
        await publishMessage("product_exchange", "", {
            event: "PRODUCT_CREATED",
            data: {
                productId: product._id,
                name: product.name,
                price: product.price,
                stock: product.stock,
            },
        });

        res.status(201).json({ message: "Product created", product });
    } catch (error) {
        console.error("Create product error:", error.message);
        res.status(500).json({ error: "Failed to create product" });
    }
});

// ─── PUT /:id — Update product ──────────────────────────────────────
router.put("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid product ID format" });
        }
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Publish update event
        await publishMessage("product_exchange", "", {
            event: "PRODUCT_UPDATED",
            data: {
                productId: product._id,
                name: product.name,
                price: product.price,
                stock: product.stock,
            },
        });

        res.json({ message: "Product updated", product });
    } catch (error) {
        console.error("Update product error:", error.message);
        res.status(500).json({ error: "Failed to update product" });
    }
});

// ─── DELETE /:id — Soft delete product ──────────────────────────────
router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid product ID format" });
        }
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json({ message: "Product deleted", product });
    } catch (error) {
        console.error("Delete product error:", error.message);
        res.status(500).json({ error: "Failed to delete product" });
    }
});

module.exports = router;
