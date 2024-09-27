const express = require("express");
const AdminRouter = require("./admin.routes.js");
const checkForAuthenticationCookie = require("../middleware/auth.js");
const UserRouter = require("./user.routes.js");
const ProUserRouter = require("./prouser.routes.js");
const { adminMiddleware } = require("../middleware/adiminMiddleware.js");
const { signin,checkAdmin } = require("../controllers/admin.controller.js");
const UserController = require("../controllers/user.controller.js");


const router = express.Router();
router.post("/admin/check",checkAdmin);
router.post("/admin/signin", signin);
router.use("/admin", adminMiddleware, AdminRouter); 
router.get("/user/check",UserController.userCheck);
router.post("/signup",UserController.signup);
router.post("/signin",UserController.signin);
router.use("/user",checkForAuthenticationCookie, UserRouter);
router.use("/prouser",checkForAuthenticationCookie, ProUserRouter);








router.get('/logout', (req, res) => {
    console.log('Logging out');
    try {
        res.clearCookie('token');
        res.status(200).json({ message: 'You are logged out' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
