const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    // Intercept /ws requests from React Dev Server to prevent them from hitting the backend
    // This stops the "GET /ws 400" errors in the Python logs
    app.use('/ws', (req, res) => {
        res.send('ok');
    });

    // API Proxy
    app.use(
        ['/api', '/admin'],
        createProxyMiddleware({
            target: 'http://127.0.0.1:5000',
            changeOrigin: true,
            secure: false,
        })
    );

    // WebSocket Proxy (Isolated for robustness)
    app.use(
        '/socket.io',
        createProxyMiddleware({
            target: 'http://127.0.0.1:5000',
            changeOrigin: true,
            secure: false,
            ws: true,
            logLevel: 'debug' // Log proxy activity to console
        })
    );
};
