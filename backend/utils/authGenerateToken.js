const jwt = require("jsonwebtoken");
const crypto = require("crypto");


const generateAccessToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m"
        }
    );
};


const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d"
        }
    );
};


const hashToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};


const refreshCookieOptions = {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite:
        process.env.NODE_ENV === "production"
            ? "none"
            : "lax",

    path: "/api/auth",

    maxAge: 7 * 24 * 60 * 60 * 1000
};


module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    refreshCookieOptions
};