const crypto = require('crypto');


const mockAuthCodes = new Map();





exports.renderAuthorizePage = (req, res) => {
  const { redirect_uri, client_id, state, code_challenge, code_challenge_method } = req.query;


  if (!redirect_uri || !client_id || !state || !code_challenge) {
    return res.status(400).send('Missing required OAuth2 parameters');
  }


  const html = `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BRD Sandbox - Autorizare</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; width: 100%; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; color: #e5002b; margin-bottom: 20px; }
        .title { font-size: 18px; margin-bottom: 10px; color: #333; }
        .description { font-size: 14px; color: #666; margin-bottom: 30px; }
        .btn-approve { background-color: #e5002b; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; width: 100%; margin-bottom: 10px; transition: background-color 0.2s; }
        .btn-approve:hover { background-color: #cc0026; }
        .btn-deny { background-color: transparent; color: #666; border: 1px solid #ccc; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; width: 100%; transition: background-color 0.2s; }
        .btn-deny:hover { background-color: #f4f4f4; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">BRD - Groupe Société Générale</div>
        <div class="title">Aprobare Acces Conturi (Sandbox)</div>
        <div class="description">
          Aplicația <b>Novence Finance</b> solicită acces la conturile tale de test (Sandbox), informațiile despre sold și istoricul tranzacțiilor.
        </div>
        
        <form action="/api/brd/oauth/authorize" method="POST">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
          <input type="hidden" name="state" value="${state}" />
          <input type="hidden" name="code_challenge" value="${code_challenge}" />
          <input type="hidden" name="code_challenge_method" value="${code_challenge_method}" />
          <input type="hidden" name="action" value="approve" />
          
          <button type="submit" class="btn-approve">Aprobă Accesul</button>
        </form>
        
        <form action="/api/brd/oauth/authorize" method="POST">
           <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
           <input type="hidden" name="state" value="${state}" />
           <input type="hidden" name="action" value="deny" />
           <button type="submit" class="btn-deny">Refuză</button>
        </form>
      </div>
    </body>
    </html>
  `;

  res.send(html);
};





exports.handleAuthorizeSubmit = (req, res) => {
  console.log('WebView POST /authorize body:', req.body);
  const { redirect_uri, state, code_challenge, code_challenge_method, action } = req.body;

  if (action === 'deny') {

    return res.redirect(`${redirect_uri}?error=access_denied&state=${state}`);
  }

  if (action === 'approve') {

    const authCode = crypto.randomBytes(16).toString('hex');


    mockAuthCodes.set(authCode, { code_challenge, code_challenge_method });


    setTimeout(() => {
      mockAuthCodes.delete(authCode);
    }, 5 * 60 * 1000);


    return res.redirect(`${redirect_uri}?code=${authCode}&state=${state}`);
  }

  res.status(400).send('Invalid action');
};






exports.exchangeToken = (req, res) => {
  const { grant_type, code, redirect_uri, client_id, code_verifier } = req.body;

  if (grant_type === 'authorization_code') {

    const codeData = mockAuthCodes.get(code);
    if (!codeData) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
    }


    if (code_verifier && codeData.code_challenge) {


    }


    mockAuthCodes.delete(code);


    const access_token = 'brd_mock_access_' + crypto.randomBytes(16).toString('hex');
    const refresh_token = 'brd_mock_refresh_' + crypto.randomBytes(16).toString('hex');

    return res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token,
      scope: 'AIS'
    });
  }

  if (grant_type === 'refresh_token') {
    const { refresh_token } = req.body;
    if (!refresh_token || !refresh_token.startsWith('brd_mock_refresh_')) {
      return res.status(400).json({ error: 'invalid_grant' });
    }


    const access_token = 'brd_mock_access_' + crypto.randomBytes(16).toString('hex');
    return res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600
    });
  }

  return res.status(400).json({ error: 'unsupported_grant_type' });
};