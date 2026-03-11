const jwt = require("jsonwebtoken");
require("dotenv").config();

// Get secret dynamically so it always reflects the current environment
const getJwtSecret = () => process.env.JWT_SECRET || "microservices_super_secret_key_2024";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";

// A simple in-memory blacklist (since we removed Redis for intermediate level)
// Note: In a real distributed system, this would need a central database/cache.
const tokenBlacklist = new Set();

function generateToken(payload) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

async function verifyToken(token) {
    try {
        if (tokenBlacklist.has(token)) {
            throw new Error("Token has been invalidated (logged out)");
        }
        const decoded = jwt.verify(token, getJwtSecret());
        return decoded;
    } catch (error) {
        console.error("JWT Verification Error Details:", error.message);
        throw error;
    }
}

// Add token to in-memory blacklist
function blacklistToken(token) {
    tokenBlacklist.add(token);
    // Optionally: set a timeout to remove it from memory after expiry to avoid memory leak
    return true;
}

module.exports = { generateToken, verifyToken, blacklistToken };
