const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { generateToken, blacklistToken } = require("../../shared/auth");
const { publishMessage } = require("../../shared/rabbitmq");

// ─── POST /register ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const user = await User.create({ name, email, password });

        // Generate JWT token
        const token = generateToken({ id: user._id, email: user.email, role: user.role });

        // Publish USER_REGISTERED event to RabbitMQ
        await publishMessage("user_exchange", "", {
            event: "USER_REGISTERED",
            data: {
                userId: user._id,
                name: user.name,
                email: user.email,
                registeredAt: user.createdAt,
            },
        });

        res.status(201).json({
            message: "User registered successfully",
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token,
        });
    } catch (error) {
        console.error("Registration error:", error.message);
        res.status(500).json({ error: "Registration failed" });
    }
});

// ─── POST /login ────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with password field
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare passwords
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = generateToken({ id: user._id, email: user.email, role: user.role });

        res.json({
            message: "Login successful",
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token,
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ error: "Login failed" });
    }
});

// ─── POST /logout ───────────────────────────────────────────────────
router.post("/logout", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            // simplified in-memory blacklisting
            blacklistToken(token);
        }
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error.message);
        res.status(500).json({ error: "Logout failed" });
    }
});

// ─── GET /profile ───────────────────────────────────────────────────
router.get("/profile", async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        if (!userId) {
            return res.status(401).json({ error: "User ID not found in request" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        console.error("Profile error:", error.message);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// ─── PUT /profile ───────────────────────────────────────────────────
router.put("/profile", async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { name } = req.body;

        const user = await User.findByIdAndUpdate(userId, { name }, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Profile updated", user });
    } catch (error) {
        console.error("Profile update error:", error.message);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

module.exports = router;
