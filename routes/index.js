const express = require("express");
const AdminRouter = require("./admin.routes.js");
const { checkForAuthenticationCookie } = require("../middleware/auth.js");
const UserRouter = require("./user.routes.js");
const ProUserRouter = require("./prouser.routes.js");
const { adminMiddleware } = require("../middleware/adiminMiddleware.js");
const { signin,checkUser } = require("../controllers/admin.controller.js");

const router = express.Router();
router.post("/admin/check",checkUser);
router.post("/admin/signin", signin);
router.use("/admin", adminMiddleware, AdminRouter); 
router.use(checkForAuthenticationCookie("token")); 
router.use("/user", UserRouter);
router.use("/prouser", ProUserRouter);










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
