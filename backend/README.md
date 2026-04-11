# IFIX Backend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env with your API keys and database credentials
```

### 3. Create Database

```bash
# Create MySQL database
mysql -u root -p < database/setup.sql
# OR manually create database
# mysql> CREATE DATABASE ifix_db;
```

### 4. Initialize Tables

```bash
node database/init.js
```

### 5. Start Backend Server

```bash
npm run dev  # development with nodemon
# OR
npm start   # production
```

Server will run on `http://localhost:5000`

---

## Environment Variables (.env)

### Database

- `DB_HOST`: MySQL host (default: localhost)
- `DB_USER`: MySQL username
- `DB_PASSWORD`: MySQL password
- `DB_NAME`: Database name (default: ifix_db)
- `DB_PORT`: MySQL port (default: 3306)

### Payment Gateway (Razorpay)

Get from: https://dashboard.razorpay.com/app/keys

- `RAZORPAY_KEY_ID`: Your Razorpay Key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret

### YouTube API

Get from: https://console.cloud.google.com/

- `YOUTUBE_API_KEY`: Your YouTube Data API key
- If the API key is missing, the backend falls back to the channel RSS feed so the home and shop video sections still render.

### Google Sheets Integration

1. Create Google Cloud Project: https://console.cloud.google.com/
2. Enable Google Sheets API
3. Create Service Account and download JSON
4. Get values from service account JSON:
   - `GOOGLE_SHEETS_CLIENT_EMAIL`: service_account_email
   - `GOOGLE_SHEETS_PRIVATE_KEY`: private_key (with \n escaped)
   - `GOOGLE_PROJECT_ID`: project_id
5. Create a Google Sheet and share with service account email
6. Copy Sheet ID from URL (between `/d/` and `/edit`)
   - `GOOGLE_SHEETS_ID`: Your spreadsheet ID

### Image Upload Storage (Blog/Admin)

By default uploads are saved to local `backend/uploads/`, which is not persistent on many hosting platforms.
For production, configure Cloudinary:

1. Create account: https://cloudinary.com/
2. In Dashboard, copy:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

3. Add env variables:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (optional, default: `ifix/blogs`)

When Cloudinary env vars are present, `/api/blog/upload-image` stores images in Cloudinary and returns a persistent HTTPS URL.

### Admin Setup

- `ADMIN_USERNAME`: Default admin username
- `ADMIN_PASSWORD`: Default admin password (will be hashed)
- `JWT_SECRET`: Secret key for JWT tokens

### Server

- `PORT`: API server port (default: 5000)
- `NODE_ENV`: development | production
- `FRONTEND_URL`: Frontend origin for CORS

---

## API Endpoints

### Products

- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Blog

- `GET /api/blog` - List published blogs
- `GET /api/blog/post/:slug` - Get single blog by slug
- `POST /api/blog` - Create blog (admin)
- `PUT /api/blog/:id` - Update blog (admin)
- `DELETE /api/blog/:id` - Delete blog (admin)

### YouTube

- `GET /api/youtube/videos` - Get channel videos
- `GET /api/youtube/channel-info` - Get channel info

### Contact Forms

- `POST /api/contact` - Submit contact form (saves to DB + Google Sheets)
- `GET /api/contact` - Get all contacts (admin)

### Authentication

- `POST /api/auth/register-admin` - Create first admin user
- `POST /api/auth/login` - Admin login (returns JWT)
- `GET /api/auth/verify` - Verify token

### Payment

- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify-payment` - Verify payment signature
- `GET /api/payment/order-status/:orderId` - Get order status

---

## Database Tables

1. **products** - Product listings
2. **orders** - Customer orders
3. **blog_posts** - Blog articles
4. **contacts** - Contact form submissions
5. **admin_users** - Admin users
6. **youtube_videos** - Cached YouTube videos

---

## First Time Setup Instructions

1. Copy `.env.example` to `.env`
2. Fill in all required API keys
3. Create MySQL database
4. Run `node database/init.js` to create tables
5. Run `npm run dev` to start server
6. Frontend will call `/api/auth/register-admin` to create first admin user
7. Test with `http://localhost:5000/api/health`

---

## Troubleshooting

**Database connection error:**

- Check MySQL is running
- Verify DB credentials in `.env`

**YouTube API error:**

- Ensure API is enabled in Google Cloud Console
- Check API key is valid

**Google Sheets error:**

- Verify service account credentials
- Share Google Sheet with service account email

**Image upload works locally but missing after deploy:**

- Configure Cloudinary env variables for persistent storage
- Restart backend after updating env variables

**Razorpay error:**

- Check Key ID and Secret are correct
- Ensure account is in live mode for testing

---

## Production Deployment

1. Set `NODE_ENV=production`
2. Use environment variables from hosting provider
3. Use strong JWT_SECRET
4. Use external MySQL host (not localhost)
5. Set proper CORS FRONTEND_URL
6. Use process manager (PM2, systemd, etc.)

Example with PM2:

```bash
npm install -g pm2
pm2 start server.js --name "ifix-api"
pm2 save
pm2 startup
```

---

## Testing Endpoints

Use Postman or cURL to test:

```bash
# Health check
curl http://localhost:5000/api/health

# Create product
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"iPhone 13","price":25000,"category":"phones"}'

# Get YouTube videos
curl http://localhost:5000/api/youtube/videos

# Submit contact form
curl -X POST http://localhost:5000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","message":"Test"}'
```

---

## Support

For issues, check:

1. `.env` configuration
2. Database connection
3. API key validity
4. Backend console logs
5. Network/CORS settings
