const express = require("express");
const AdminRouter = require("./admin.routes.js");
const checkForAuthenticationCookie = require("../middleware/auth.js");
const UserRouter = require("./user.routes.js");
const ProUserRouter = require("./prouser.routes.js");
const { adminMiddleware } = require("../middleware/adiminMiddleware.js");
const { signin, checkAdmin } = require("../controllers/admin.controller.js");
const UserController = require("../controllers/user.controller.js");
const passport = require('passport');

const router = express.Router();

// Admin routes
router.post("/admin/check", checkAdmin);
router.post("/admin/signin", signin);
router.use("/admin",adminMiddleware, AdminRouter); 

// User authentication routes
router.get("/user/check", UserController.userCheck);
// router.post("/signup", UserController.signup);
router.post("/signin", UserController.signin);

// Google login routes
router.get("/googlelogin", UserController.googlelogin);
router.get("/google/callback",passport.authenticate("google", { failureRedirect: "/login" }),  UserController.googleCallback);

// Protected routes
router.use("/user", checkForAuthenticationCookie, UserRouter);
router.use("/prouser", checkForAuthenticationCookie, ProUserRouter);

// Logout routes
router.get('/logout', (req, res) => {
    console.log('Logging out');
    try {
        res.clearCookie("token", { path: "/", sameSite: "None", secure: true });
        res.status(200).json({ message: 'You are logged out' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/admin/logout', (req, res) => {
    console.log('Logging out');
    try {
        res.clearCookie("admin_token", { path: "/", sameSite: "None", secure: true });
        res.status(200).json({ message: 'You are logged out' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
