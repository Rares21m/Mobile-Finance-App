const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const brdController = require('../controllers/brd.controller');
const brdMockOAuthController = require('../controllers/brd.mock-oauth.controller');





router.get('/oauth/authorize', brdMockOAuthController.renderAuthorizePage);
router.post('/oauth/authorize', brdMockOAuthController.handleAuthorizeSubmit);
router.post('/oauth/token', brdMockOAuthController.exchangeToken);





router.post('/init-consent', authMiddleware, brdController.initConsent);


router.post('/exchange-token', authMiddleware, brdController.exchangeToken);


router.get('/connection-data/:connectionId', authMiddleware, brdController.getConnectionData);

module.exports = router;