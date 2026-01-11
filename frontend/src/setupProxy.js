const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    // Intercept /ws requests from React Dev Server to prevent them from hitting the backend
    // This stops the "GET /ws 400" errors in the Python logs
    app.use('/ws', (req, res) => {
        res.send('ok');
    });

    // Create Proxy instances
    const apiProxy = createProxyMiddleware({
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
    });

    const socketProxy = createProxyMiddleware({
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        logLevel: 'debug'
    });

    // Manually route requests to preserve path prefixes (avoid app.use stripping)
    app.use((req, res, next) => {
        // Forward API requests
        if (req.url.startsWith('/api')) {
            return apiProxy(req, res, next);
        }
        // Forward specific legacy/direct paths (Robustness)
        // Explicitly match /login/login (API) but NOT /login (Page)
        if (req.url.includes('/login/login')) {
            return apiProxy(req, res, next);
        }

        if (req.url.startsWith('/socket.io')) {
            return socketProxy(req, res, next);
        }
        next();
    });
};
