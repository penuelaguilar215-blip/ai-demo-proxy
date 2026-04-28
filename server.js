const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('AI Demo Drop Proxy — Running ✅');
});

app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing ?url= parameter');

  let target;
  try { target = new URL(targetUrl); } 
  catch (e) { return res.status(400).send('Invalid URL'); }

  const proxy = createProxyMiddleware({
    target: target.origin,
    changeOrigin: true,
    selfHandleResponse: false,
    pathRewrite: () => target.pathname + target.search,
    on: {
      proxyRes: (proxyRes) => {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['X-Frame-Options'];
        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['Content-Security-Policy'];
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      },
      error: (err, req, res) => {
        res.status(500).send('Proxy error: ' + err.message);
      }
    }
  });
  proxy(req, res, next);
});

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
