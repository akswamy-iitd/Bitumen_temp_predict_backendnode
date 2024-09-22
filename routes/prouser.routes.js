const {Router}  = require('express');
const ProUserController = require('../controllers/prouser.controller');
const uploadRoute = require('./uploadRoute.js');
const ProUserRouter = Router();


ProUserRouter.post('/signin', ProUserController.signin);
ProUserRouter.get('/profile', ProUserController.getProfile);
ProUserRouter.post('/signup', ProUserController.signup);
ProUserRouter.get('/logout', ProUserController.logout);
ProUserRouter.post('/predict', ProUserController.predict);
ProUserRouter.use('/findwithcsv', uploadRoute);
module.exports = ProUserRouter 