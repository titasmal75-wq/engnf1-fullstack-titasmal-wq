require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const mongooseDB = require("./config/mongodbConnection");
const authRouter = require("./router/authRouter");
const adminRouter = require("./router/adminRouter");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, postman)
            if (!origin) return callback(null, true);
            if (
                allowedOrigins.includes(origin) ||
                /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
            ) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// ─── Database ─────────────────────────────────────────────────────────────────
mongooseDB();

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.send("Express + MongoDB Connected!");
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong", error: err.message });
});

// ─── Server ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/`);
});
