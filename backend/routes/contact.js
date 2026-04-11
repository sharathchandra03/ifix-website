const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

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
    subject
  } = req.body;

  const firstName = (first_name || '').trim();
  const lastName = (last_name || '').trim();
  const fullName = (name || `${firstName} ${lastName}`).trim();
  const courseInterested = (course_interested || subject || '').trim();
  const preferredMode = (preferred_mode || '').trim();

  if (!fullName || !email || !message) {
    return res.status(400).json({ error: 'First name (or name), email, and message are required' });
  }

  let connection;
  try {
    // Save to database
    connection = await global.db.getConnection();
    const [result] = await connection.query(
      'INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [
        fullName,
        email,
        phone || '',
        courseInterested || 'General Inquiry',
        preferredMode ? `[Preferred Mode: ${preferredMode}] ${message}` : message
      ]
    );

    const contactId = result.insertId;

    // Try to save to Google Sheets if configured
    if (process.env.GOOGLE_SHEETS_ID) {
      try {
        await appendToGoogleSheets({
          firstName,
          lastName,
          email,
          phone,
          courseInterested,
          preferredMode,
          message
        });
        await connection.query(
          'UPDATE contacts SET sheets_row_id = ? WHERE id = ?',
          [Date.now().toString(), contactId]
        );
      } catch (sheetsError) {
        console.error('Google Sheets error (non-blocking):', sheetsError.message);
        // Continue even if Google Sheets fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us!',
      contactId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Helper function to append to Google Sheets
async function appendToGoogleSheets({ firstName, lastName, email, phone, courseInterested, preferredMode, message }) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const values = [[
    firstName || '',
    lastName || '',
    email || '',
    phone || '',
    courseInterested || '',
    preferredMode || '',
    message || '',
    new Date().toISOString()
  ]];
  let targetRange = process.env.GOOGLE_SHEETS_RANGE || 'Contacts!A:H';

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

    targetRange = `${firstTitle}!A:H`;
    return await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: targetRange,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
  }
}

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
