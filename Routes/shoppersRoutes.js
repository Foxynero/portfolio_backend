const express = require("express");
const router = express.Router();
const {
  getShopper,
  loginShopper,
  changePassword,
  registerShopper,
  activateShopper,
  forgotPassword,
} = require("../Controllers/shoppersControllers");
const { protect } = require("../Middlewares/shopperAuthMiddleware");

router.get("/me/:id", protect, getShopper);

router.post("/login", loginShopper);
router.post("/register", registerShopper);
router.post("/activate_user", activateShopper);
router.post("/forgot_password", protect, forgotPassword);
router.post("/change_password/:id", protect, changePassword);

module.exports = router;
