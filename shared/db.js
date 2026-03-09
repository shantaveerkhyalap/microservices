const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

async function connectDB(dbName) {
    const uri = `${MONGO_URI}/${dbName}`;

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            await mongoose.connect(uri);
            console.log(`✅ MongoDB connected: ${dbName}`);
            return mongoose.connection;
        } catch (error) {
            retries++;
            console.error(
                `❌ MongoDB connection failed (attempt ${retries}/${maxRetries}):`,
                error.message
            );
            if (retries === maxRetries) {
                console.error("💀 Max retries reached. Exiting...");
                process.exit(1);
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
}

module.exports = { connectDB };
