const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.send('Proxy Running ✅'));

app.use('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing ?url=');

  try {
    const parsed = new URL(targetUrl);
    const baseUrl = parsed.origin;

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    const contentType = response.headers['content-type'] || '';
    delete response.headers['x-frame-options'];
    delete response.headers['content-security-policy'];
    response.headers['access-control-allow-origin'] = '*';

    if (contentType.includes('text/html')) {
      let html = response.data.toString('utf8');
      // Rewrite absolute paths to go through proxy
      html = html.replace(/(href|src|action)="\/([^"]*?)"/g, `$1="${baseUrl}/$2"`);
      html = html.replace(/(href|src|action)='\/([^']*?)'/g, `$1='${baseUrl}/$2'`);
      res.set(response.headers);
      res.send(html);
    } else {
      res.set(response.headers);
      res.send(response.data);
    }

  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
});



app.options('/chat', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.sendStatus(200);
});

app.post('/chat', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  try {
    const response = await axios.post('https://api.vapi.ai/chat', req.body, {
      headers: {
        'Authorization': 'Bearer 8dbabe5c-2e95-4df7-a63e-0a9127c6d1c5',
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => console.log(`Proxy on port ${PORT}`));
