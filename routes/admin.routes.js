const { Router } = require('express');
const AdminController = require('../controllers/admin.controller');
const AdminRouter = Router();

AdminRouter.post('/updatecredit', AdminController.updateUserCredit);
AdminRouter.get('/users', AdminController.getAllUsers);
// AdminRouter.get('/users/:role', AdminController.getUsersByRole);
// AdminRouter.delete('/users/:userId', AdminController.deleteUser);
// AdminRouter.post('/message', AdminController.sendMessage);
AdminRouter.post('/delete_user', AdminController.deleteUser);
AdminRouter.get('/allfeedback', AdminController.getAllFeedback);
AdminRouter.post('/adduser', AdminController.addUser);

module.exports = AdminRouter;
