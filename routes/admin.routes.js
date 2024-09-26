const { Router } = require('express');
const AdminController = require('../controllers/admin.controller');
const AdminRouter = Router();

AdminRouter.get('/check_user', AdminController.checkUser);
AdminRouter.get('/logout', AdminController.logout);
AdminRouter.post('/updatecredit', AdminController.updateUserCredit);
AdminRouter.get('/users', AdminController.getAllUsers);
AdminRouter.get('/users/:role', AdminController.getUsersByRole);
AdminRouter.delete('/users/:userId', AdminController.deleteUser);
AdminRouter.post('/message', AdminController.sendMessage);

module.exports = AdminRouter;
