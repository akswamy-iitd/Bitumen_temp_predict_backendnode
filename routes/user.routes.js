const {Router}  = require('express');
const UserController = require('../controllers/user.controller');
const User = require('../models/user');
const UserRouter = Router();

// UserRouter.get('/profile', UserController.getUserProfile);
UserRouter.post('/signin', UserController.signin);
UserRouter.get('/profile', UserController.getProfile);
UserRouter.post('/signup', UserController.signup);
UserRouter.get('/logout', UserController.logout);
UserRouter.post('/find', UserController.finddata);
UserRouter.post('/predict', UserController.predict);
module.exports = UserRouter