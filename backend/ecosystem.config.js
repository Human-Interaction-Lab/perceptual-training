module.exports = {
  apps: [{
    name: "speech-training-backend",
    script: "./server.js",
    output: "./logs/backend-out.log",
    error: "./logs/backend-error.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    time: true,
    env: {
      NODE_ENV: "production",
      DEBUG: "speech-training:*"
    }
  }]
}