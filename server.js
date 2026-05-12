const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { URL } = require('url');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory store for scraped content
const contentStore = {};

app.get('/', (req, res) => res.send('Proxy Running ✅'));

// Store content and return a short ID
app.post('/store', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  try {
    const id = Math.random().toString(36).substring(2, 8);
    contentStore[id] = req.body.content || '';
    console.log('Stored content with id:', id, 'length:', contentStore[id].length);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve content by ID
app.get('/content/:id', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  const content = contentStore[req.params.id] || '';
  res.json({ content });
});

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
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: req.body.systemPrompt || 'You are a helpful assistant.',
      messages: [
        { role: 'user', content: req.body.input }
      ]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });
    const reply = response.data.content[0].text;
    res.json({ output: [{ role: 'assistant', content: reply }] });
  } catch (err) {
    console.error('Anthropic error:', err.response ? JSON.stringify(err.response.data) : err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Proxy on port ${PORT}`));
