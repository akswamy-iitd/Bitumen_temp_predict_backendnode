const { Router } = require('express');
const AdminController = require('../controllers/admin.controller');
const AdminRouter = Router();

AdminRouter.post('/signin', AdminController.signin);
AdminRouter.get('/logout', AdminController.logout);
AdminRouter.post('/updatecredit', AdminController.updateUserCredit);
AdminRouter.get('/users', AdminController.getAllUsers);
AdminRouter.get('/users/:role', AdminController.getUsersByRole);
AdminRouter.delete('/users/:userId', AdminController.deleteUser);

module.exports = AdminRouter;
