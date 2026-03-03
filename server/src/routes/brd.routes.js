const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const brdController = require('../controllers/brd.controller');
const brdMockOAuthController = require('../controllers/brd.mock-oauth.controller');

// ==========================================
// MOCK OAUTH2 ROUTES (For WebView Flow)
// ==========================================
// These endpoints act as the "bank login page" and "bank token server"
router.get('/oauth/authorize', brdMockOAuthController.renderAuthorizePage);
router.post('/oauth/authorize', brdMockOAuthController.handleAuthorizeSubmit);
router.post('/oauth/token', brdMockOAuthController.exchangeToken);

// ==========================================
// API ROUTES (For Mobile App)
// ==========================================
// Init consent (PKCE) will return the authUrl pointing to our local /oauth/authorize
router.post('/init-consent', authMiddleware, brdController.initConsent);

// Exchange the mock authorization code for mock tokens, persisting the connection
router.post('/exchange-token', authMiddleware, brdController.exchangeToken);

// Fetch the aggregated account/balance/transaction data from BRD Sandbox
router.get('/connection-data/:connectionId', authMiddleware, brdController.getConnectionData);

module.exports = router;
