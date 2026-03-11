const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

async function connectDB(mongooseInstance, dbNameOverride) {
    const dbName = dbNameOverride || process.env.DB_NAME || "microservices_db";

    // Handle Atlas URIs cleanly
    let uri = MONGO_URI;
    if (uri.includes("?")) {
        // e.g., mongodb+srv://.../cluster0?retryWrites=true -> .../users_db?retryWrites=true
        uri = uri.replace(/\/?\?/, `/${dbName}?`);
    } else {
        uri = `${MONGO_URI}/${dbName}`;
    }

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            await mongooseInstance.connect(uri);
            console.log(`MongoDB connected: ${dbName}`);
            return mongooseInstance.connection;
        } catch (error) {
            retries++;
            console.error(
                `MongoDB connection failed (attempt ${retries}/${maxRetries}):`,
                error.message
            );
            if (retries === maxRetries) {
                console.error("Max retries reached. Exiting...");
                process.exit(1);
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
}

module.exports = { connectDB };
