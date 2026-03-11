const mongoose = require("mongoose");

const uri = "mongodb+srv://Microservices:bKYdqlaYFoBezdrs@cluster0.tx6by.mongodb.net/users_db";

async function testConnection() {
    try {
        console.log("Attempting to connect to MongoDB...");
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log("Connection successful! State:", mongoose.connection.readyState);

        // Define a dummy schema
        const Dummy = mongoose.model("Dummy", new mongoose.Schema({ name: String }));
        console.log("Attempting a query...");
        const result = await Dummy.findOne();
        console.log("Query successful, result:", result);

    } catch (error) {
        console.error("Connection/Query failed. Error details:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

testConnection();
