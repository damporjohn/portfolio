import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const buildFlowiseUrl = () => {
  const direct = (process.env.FLOWISE_API_URL || '').replace(/\/$/, '');
  const chatflowId = process.env.FLOWISE_CHATFLOW_ID;
  if (direct) {
    if (/\/api\//.test(direct)) {
      return direct;
    }
    if (chatflowId) {
      return `${direct}/api/v1/prediction/${chatflowId}`;
    }
  }
  const base = (process.env.FLOWISE_API_BASE_URL || process.env.FLOWISE_API || '').replace(/\/$/, '');
  if (base && chatflowId) {
    return `${base}/api/v1/prediction/${chatflowId}`;
  }
  if (chatflowId) {
    return `https://cloud.flowiseai.com/api/v1/prediction/${chatflowId}`;
  }
  return '';
};

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const url = buildFlowiseUrl();
    if (!url) {
      return res.status(500).json({ error: 'Flowise endpoint is not configured on the server.' });
    }

    const payload = {
      question: message,
      history
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    if (process.env.FLOWISE_API_KEY) {
      headers.Authorization = `Bearer ${process.env.FLOWISE_API_KEY}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Flowise request failed', detail: text });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON from Flowise', raw: text });
    }

    const reply =
      data?.reply ||
      data?.text ||
      data?.answer ||
      data?.message ||
      (Array.isArray(data) ? data[0]?.text : null) ||
      'Sorry, I could not get a response.';

    return res.json({ reply });
  } catch (err) {
    console.error('Backend error:', err);
    return res.status(500).json({ error: 'Server error contacting Flowise.' });
  }
});

app.get('/', (_req, res) => {
  res.send('Chatbot portfolio backend is running.');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


