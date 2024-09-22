const express = require("express");
const AdminRouter = require("./admin.routes.js");
const { checkForAuthenticationCookie } = require("../middleware/auth.js");
const UserRouter = require("./user.routes.js");
const ProUserRouter = require("./prouser.routes.js");
const { adminMiddleware } = require("../middleware/adiminMiddleware.js");

const router = express.Router();

router.use("/admin", adminMiddleware, AdminRouter); 
router.use(checkForAuthenticationCookie("token")); 
router.use("/user", UserRouter);
router.use("/prouser", ProUserRouter);

module.exports = router;
