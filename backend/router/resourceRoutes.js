const express = require("express");
const router = express.Router();

const {
    getResources,
    getResourceById,
    createResource,
    updateResource,
    getResourceAvailability
} = require("../controller/resourceController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);
router.get("/", getResources);
router.get("/:id/availability", getResourceAvailability);
router.get("/:id", getResourceById);

router.post(
    "/",
    roleMiddleware("ADMIN"),
    createResource
);


router.patch(
    "/:id",
    roleMiddleware("ADMIN"),
    updateResource
);

module.exports = router;