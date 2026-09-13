const {Router}  = require('express');
const ProUserController = require('../controllers/prouser.controller');
const uploadRoute = require('./uploadRoute.js');
const {
  getIndiaGeoJson,
  getPdfStateBoundaryGeoJson,
  isPointInIndia,
  parseCoordinates,
} = require('../services/indiaBoundary.js');
const { createCaptcha, solveCaptcha } = require('../services/captcha.js');
const ProUserRouter = Router();


ProUserRouter.post('/signin', ProUserController.signin);
ProUserRouter.get('/profile', ProUserController.getProfile);
ProUserRouter.post('/signup', ProUserController.signup);
ProUserRouter.get('/captcha', (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json(createCaptcha(req.user.id));
});
ProUserRouter.post('/captcha/verify', (req, res) => {
  const proof = solveCaptcha(req.body.challengeId, req.body.answer, req.user.id);
  if (!proof) {
    return res.status(400).json({ error: 'CAPTCHA is incorrect or expired.' });
  }
  return res.json({ proof });
});
ProUserRouter.post('/predict', ProUserController.predict);
ProUserRouter.post('/check-india', async (req, res) => {
  try {
    const coordinates = parseCoordinates(req.body.lat, req.body.lon);
    if (!coordinates) {
      return res.status(400).json({ inIndia: false, error: 'Invalid latitude or longitude' });
    }

    const inIndia = await isPointInIndia(coordinates.lat, coordinates.lon);
    return res.json({ inIndia });
  } catch (error) {
    console.error('Failed to validate coordinates:', error);
    return res.status(500).json({ error: 'Failed to validate coordinates' });
  }
});
ProUserRouter.get('/india-boundary', async (req, res) => {
  try {
    res.set('Cache-Control', 'private, max-age=86400');
    return res.json(await getIndiaGeoJson());
  } catch (error) {
    console.error('Failed to load India boundary:', error);
    return res.status(500).json({ error: 'Failed to load India boundary' });
  }
});
ProUserRouter.get('/pdf-state-boundary', async (req, res) => {
  try {
    res.set('Cache-Control', 'private, max-age=86400');
    return res.json(await getPdfStateBoundaryGeoJson());
  } catch (error) {
    console.error('Failed to load PDF state boundary:', error);
    return res.status(500).json({ error: 'Failed to load PDF state boundary' });
  }
});
ProUserRouter.use('/findwithcsv', uploadRoute);
module.exports = ProUserRouter
