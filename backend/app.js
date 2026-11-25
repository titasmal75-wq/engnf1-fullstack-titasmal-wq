require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const mongooseDB = require("./config/mongodbConnection");
const authRouter = require("./router/authRouter");
const adminRouter = require("./router/adminRouter");
const ticketRoutes = require("./router/ticketRoutes");
const statsRoutes = require("./router/statsRoutes");
const resourceRoutes = require("./router/resourceRoutes");
const bookingRoutes = require("./router/bookingRoutes");
const adminRoutes = require("./router/adminRoutes");


const app = express();


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


mongooseDB();

app.get("/", (req, res) => {
    res.send("Express + MongoDB Connected!");
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/tickets", ticketRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong", error: err.message });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/`);
});
