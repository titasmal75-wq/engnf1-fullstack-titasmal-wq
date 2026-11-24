const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/dashboard",
    protect,
    authorize("ADMIN"),
    (req, res) => {
        res.json({ message: "Welcome Admin Dashboard" });
    }
);

router.get(
    "/manage",
    protect,
    authorize("ADMIN"),
    (req, res) => {
        res.json({ message: "Welcome Admin" });
    }
);

router.get(
    "/profile",
    protect,
    (req, res) => {
        res.json({ user: req.user });
    }
);

module.exports = router;
