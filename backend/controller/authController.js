const User = require("../models/User");
const bcrypt = require("bcryptjs");
const {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    refreshCookieOptions,
} = require("../utils/authGenerateToken");



const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 8) {
            return res
                .status(400)
                .json({ message: "Password must contain at least 8 characters" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: "Email already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email: normalizedEmail,
            passwordHash,
            role: "USER",
        });

        return res.status(201).json({
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Email already exists" });
        }
        return res
            .status(500)
            .json({ message: "Registration failed", error: error.message });
    }
};



const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase(),
        }).select("+passwordHash +refreshTokenHash");

        if (!user || !user.isActive) {
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);


        user.refreshTokenHash = hashToken(refreshToken);
        await user.save();


        res.cookie("refreshToken", refreshToken, refreshCookieOptions);

        return res.status(200).json({
            message: "Login successful",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        return res
            .status(500)
            .json({ message: "Login failed", error: error.message });
    }
};



const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const refreshAccessToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;

        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: "Refresh token missing" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res
                .status(401)
                .json({ success: false, message: "Refresh token invalid or expired" });
        }

        const user = await User.findById(decoded.id).select("+refreshTokenHash");

        if (!user || !user.isActive) {
            return res
                .status(401)
                .json({ success: false, message: "User not found or inactive" });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        if (user.refreshTokenHash !== tokenHash) {
            return res
                .status(401)
                .json({ success: false, message: "Refresh token reuse detected" });
        }


        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        user.refreshTokenHash = hashToken(newRefreshToken);
        await user.save();

        res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

        return res.status(200).json({
            accessToken: newAccessToken,
        });
    } catch (error) {
        return res
            .status(500)
            .json({ message: "Token refresh failed", error: error.message });
    }
};



const logout = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;

        if (token) {
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
                const user = await User.findById(decoded.id);
                if (user) {
                    user.refreshTokenHash = null;
                    await user.save();
                }
            } catch {

            }
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            path: "/api/auth",
        });

        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        return res
            .status(500)
            .json({ message: "Logout failed", error: error.message });
    }
};



const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.isActive) {
            return res
                .status(401)
                .json({ message: "User not found or inactive" });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        return res
            .status(500)
            .json({ message: "Could not fetch user", error: error.message });
    }
};


module.exports = { register, login, refreshAccessToken, logout, getMe };
