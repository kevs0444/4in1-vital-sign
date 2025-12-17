const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    // Proxy API calls to Flask backend
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://127.0.0.1:5000',
            changeOrigin: true,
            logLevel: 'silent', // Suppress proxy logs
        })
    );

    // Explicitly exclude webpack HMR (Hot Module Replacement) requests from proxying
    // This prevents the 404 errors in the Flask backend logs
    app.use(
        '/*.hot-update.json',
        createProxyMiddleware({
            target: 'http://localhost:3000', // Keep HMR traffic local
            changeOrigin: false,
            logLevel: 'silent',
        })
    );

    app.use(
        '/*.hot-update.js',
        createProxyMiddleware({
            target: 'http://localhost:3000', // Keep HMR traffic local
            changeOrigin: false,
            logLevel: 'silent',
        })
    );
};
