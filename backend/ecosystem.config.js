// PM2 process manager configuration.
//
// PM2 restarts the app if it exits (the server now exits on uncaughtException
// for exactly this reason) and forwards SIGINT/SIGTERM so the graceful-shutdown
// handler can drain HTTP connections and close the DB pool on deploys.
//
// Usage on the server:
//   cd backend
//   npm ci --omit=dev
//   pm2 start ecosystem.config.js --env production
//   pm2 save        # persist across reboots
//   pm2 logs ifix-backend
//
// Render/Heroku-style platforms manage the process themselves — they don't
// need PM2; just set the start command to `node server.js`.
module.exports = {
  apps: [
    {
      name: 'ifix-backend',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '400M',
      kill_timeout: 11000, // > the server's 10s shutdown force-exit timer
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
