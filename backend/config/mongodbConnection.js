
require("dotenv").config();
const mongoose = require("mongoose");

const mongooseDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
        await mongoose.connect(mongoUri);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("MongoDB Connection Failed:", error.message);
        process.exit(1);
    }
};

module.exports = mongooseDB;
