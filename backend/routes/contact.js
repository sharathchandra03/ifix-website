const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

function normalizePrivateKey(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n');
}

function buildGoogleCredentials() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;

  if (rawJson) {
    try {
      const credentials = JSON.parse(rawJson);
      if (credentials.private_key) {
        credentials.private_key = normalizePrivateKey(credentials.private_key);
      }
      return credentials;
    } catch (error) {
      throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON: ${error.message}`);
    }
  }

  const privateKey = normalizePrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY);
  if (!privateKey) {
    throw new Error('GOOGLE_SHEETS_PRIVATE_KEY is missing or invalid');
  }

  return {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
  };
}

// POST contact form (save to database + Google Sheets)
router.post('/', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone,
    course_interested,
    preferred_mode,
    message,
    name,
    subject,
    language,
    city,
    pin_code,
    profession,
    experience_level
  } = req.body;

  const firstName = (first_name || '').trim();
  const lastName = (last_name || '').trim();
  const fullName = (name || `${firstName} ${lastName}`).trim();
  const courseInterested = (course_interested || subject || '').trim();
  const preferredMode = (preferred_mode || '').trim();
  const langVal = (language || '').trim();
  const cityVal = (city || '').trim();
  const pinCodeVal = (pin_code || '').trim();
  const professionVal = (profession || '').trim();
  const experienceLevelVal = (experience_level || '').trim();

  const autoMessage = message || [
    courseInterested ? `Course: ${courseInterested}` : '',
    cityVal ? `City: ${cityVal}` : '',
    pinCodeVal ? `Pin: ${pinCodeVal}` : '',
    professionVal ? `Profession: ${professionVal}` : '',
    experienceLevelVal ? `Experience: ${experienceLevelVal}` : '',
    langVal ? `Language: ${langVal}` : '',
    phone ? `Phone: ${phone}` : ''
  ].filter(Boolean).join(' | ');

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  let connection;
  let sheetsSynced = false;
  let sheetsErrorMessage = '';
  let dbSaved = false;
  let dbErrorMessage = '';
  let contactId = null;
  try {
    // Save to database, but do not block Sheets if DB is unavailable.
    try {
      connection = await global.db.getConnection();
      const [result] = await connection.query(
        'INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
        [
          fullName,
          email,
          phone || '',
          courseInterested || 'General Inquiry',
          preferredMode ? `[Preferred Mode: ${preferredMode}] ${autoMessage}` : autoMessage
        ]
      );

      contactId = result.insertId;
      dbSaved = true;
    } catch (dbError) {
      dbErrorMessage = dbError.message;
      console.error('Database error (non-blocking for Sheets):', dbError.message);
    }

    // Try to save to Google Sheets if configured
    if (process.env.GOOGLE_SHEETS_ID) {
      try {
        await appendToGoogleSheets({
          fullName,
          email,
          phone,
          language: langVal,
          city: cityVal,
          pinCode: pinCodeVal,
          courseInterested,
          profession: professionVal,
          experienceLevel: experienceLevelVal,
          message: autoMessage
        });
        sheetsSynced = true;
        if (connection && contactId) {
          await connection.query(
            'UPDATE contacts SET sheets_row_id = ? WHERE id = ?',
            [Date.now().toString(), contactId]
          );
        }
      } catch (sheetsError) {
        sheetsErrorMessage = sheetsError.message;
        console.error('Google Sheets error (non-blocking):', sheetsError.message);
        // Continue even if Google Sheets fails
      }
    }

    if (!dbSaved && !sheetsSynced) {
      return res.status(500).json({
        error: 'Unable to save contact submission',
        dbError: dbErrorMessage || null,
        sheetsError: sheetsErrorMessage || null
      });
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us!',
      contactId,
      dbSaved,
      sheetsSynced,
      ...(dbErrorMessage ? { dbError: dbErrorMessage } : {}),
      ...(sheetsErrorMessage ? { sheetsError: sheetsErrorMessage } : {})
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Helper function to append to Google Sheets
async function appendToGoogleSheets({ fullName, email, phone, language, city, pinCode, courseInterested, profession, experienceLevel, message }) {
  const credentials = buildGoogleCredentials();

  if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
    throw new Error('Google Sheets credentials are incomplete: project_id, client_email, and private_key are required');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const values = [[
    fullName || '',
    email || '',
    phone || '',
    language || '',
    city || '',
    pinCode || '',
    courseInterested || '',
    profession || '',
    experienceLevel || '',
    new Date().toISOString()
  ]];
  let targetRange = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:J';

  try {
    return await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: targetRange,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
  } catch (error) {
    // If the configured sheet tab does not exist, fallback to the first tab.
    if (!String(error.message || '').includes('Unable to parse range')) {
      throw error;
    }

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      fields: 'sheets(properties(title))'
    });
    const firstTitle = meta?.data?.sheets?.[0]?.properties?.title;
    if (!firstTitle) {
      throw error;
    }

    targetRange = `${firstTitle}!A:J`;
    return await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: targetRange,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
  }
}

router.get('/config-status', (req, res) => {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
  const hasInlineJson = Boolean(rawJson);
  const hasSplitCredentials = Boolean(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
    process.env.GOOGLE_SHEETS_PRIVATE_KEY &&
    process.env.GOOGLE_PROJECT_ID
  );

  res.json({
    configured: Boolean(process.env.GOOGLE_SHEETS_ID) && (hasInlineJson || hasSplitCredentials),
    hasSpreadsheetId: Boolean(process.env.GOOGLE_SHEETS_ID),
    hasInlineJson,
    hasSplitCredentials,
    range: process.env.GOOGLE_SHEETS_RANGE || 'Contacts!A:H'
  });
});

// GET all contacts (admin only)
router.get('/', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query('SELECT * FROM contacts ORDER BY created_at DESC');
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
