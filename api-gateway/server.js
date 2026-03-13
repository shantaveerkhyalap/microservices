const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../shared/auth");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// ─── Simple In-Memory Rate Limiting ─────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests, please try again after 15 minutes",
    },
});

app.use(limiter);

// ─── Service URLs ───────────────────────────────────────────────────
const SERVICES = {
    USER_SERVICE: process.env.USER_SERVICE_URL || "http://localhost:3001",
    PRODUCT_SERVICE: process.env.PRODUCT_SERVICE_URL || "http://localhost:3002",
    ORDER_SERVICE: process.env.ORDER_SERVICE_URL || "http://localhost:3003",
};

// ─── JWT Authentication Middleware ──────────────────────────────────
const PUBLIC_ROUTES = [
    "/api/users/register",
    "/api/users/login",
    "/health",
];

const authMiddleware = async (req, res, next) => {
    // Skip auth for public routes
    if (PUBLIC_ROUTES.some((route) => req.path.startsWith(route))) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = await verifyToken(token);
        // Simple blacklisting simulation for intermediate level
        if (decoded.blacklisted) {
            throw new Error("Token has been invalidated.");
        }
        req.headers["x-user-id"] = decoded.id;
        req.headers["x-user-email"] = decoded.email;
        req.headers["x-user-role"] = decoded.role || "user";
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token." });
    }
};

app.use(authMiddleware);

// ─── Proxy Configuration ────────────────────────────────────────────
// User Service
app.use(
    "/api/users",
    createProxyMiddleware({
        target: SERVICES.USER_SERVICE,
        changeOrigin: true,
        pathRewrite: { "^/api/users": "/" },
        on: {
            proxyReq: (proxyReq, req) => {
                // Forward body for POST/PUT
                if (req.body && ["POST", "PUT", "PATCH"].includes(req.method)) {
                    const bodyData = JSON.stringify(req.body);
                    proxyReq.setHeader("Content-Type", "application/json");
                    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
                    proxyReq.write(bodyData);
                }
            },
            error: (err, req, res) => {
                console.error("User Service proxy error:", err.message);
                res.status(503).json({ error: "User Service unavailable" });
            },
        },
    })
);

// Product Service
app.use(
    "/api/products",
    createProxyMiddleware({
        target: SERVICES.PRODUCT_SERVICE,
        changeOrigin: true,
        pathRewrite: { "^/api/products": "/" },
        on: {
            proxyReq: (proxyReq, req) => {
                if (req.body && ["POST", "PUT", "PATCH"].includes(req.method)) {
                    const bodyData = JSON.stringify(req.body);
                    proxyReq.setHeader("Content-Type", "application/json");
                    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
                    proxyReq.write(bodyData);
                }
            },
            error: (err, req, res) => {
                console.error("Product Service proxy error:", err.message);
                res.status(503).json({ error: "Product Service unavailable" });
            },
        },
    })
);

// Order Service
app.use(
    "/api/orders",
    createProxyMiddleware({
        target: SERVICES.ORDER_SERVICE,
        changeOrigin: true,
        pathRewrite: { "^/api/orders": "/" },
        on: {
            proxyReq: (proxyReq, req) => {
                if (req.body && ["POST", "PUT", "PATCH"].includes(req.method)) {
                    const bodyData = JSON.stringify(req.body);
                    proxyReq.setHeader("Content-Type", "application/json");
                    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
                    proxyReq.write(bodyData);
                }
            },
            error: (err, req, res) => {
                console.error("Order Service proxy error:", err.message);
                res.status(503).json({ error: "Order Service unavailable" });
            },
        },
    })
);

// ─── Health Check Aggregation ───────────────────────────────────────
app.get("/health", async (req, res) => {
    const checkService = async (name, url) => {
        try {
            const response = await axios.get(`${url}/health`, { timeout: 3000 });
            return { name, status: "healthy", data: response.data };
        } catch {
            return { name, status: "unhealthy" };
        }
    };

    const [userService, productService, orderService] = await Promise.all([
        checkService("User Service", SERVICES.USER_SERVICE),
        checkService("Product Service", SERVICES.PRODUCT_SERVICE),
        checkService("Order Service", SERVICES.ORDER_SERVICE)
    ]);

    const services = [userService, productService, orderService];
    const allHealthy = services.every((s) => s.status === "healthy");

    res.status(allHealthy ? 200 : 503).json({
        gateway: "healthy",
        timestamp: new Date().toISOString(),
        services,
    });
});

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("Gateway Error:", err);
    res.status(500).json({ error: "Internal Gateway Error" });
});

// ─── Start Server ───────────────────────────────────────────────────
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`\n🚀 API Gateway running on http://localhost:${PORT}`);
        console.log(`📡 Routing to:`);
        console.log(`   → User Service:    ${SERVICES.USER_SERVICE}`);
        console.log(`   → Product Service: ${SERVICES.PRODUCT_SERVICE}`);
        console.log(`   → Order Service:   ${SERVICES.ORDER_SERVICE}\n`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(`\n❌ Port ${PORT} is already in use.`);
            console.error(`   Run: kill -9 $(lsof -t -i:${PORT}) to free it, then restart.\n`);
            process.exit(1);
        } else {
            throw err;
        }
    });

    // ─── Graceful Shutdown ───────────────────────────────────────────────
    process.on("SIGTERM", () => {
        server.close(() => {
            console.log("API Gateway shut down gracefully.");
            process.exit(0);
        });
    });

    process.on("SIGINT", () => {
        server.close(() => {
            console.log("API Gateway shut down gracefully.");
            process.exit(0);
        });
    });
}

module.exports = app;
