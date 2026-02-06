import express from 'express';
import axios from 'axios';

const router = express.Router();

// Returns the resolved AI service base URL and a live ping to its /health endpoint
router.get('/health', async (req, res) => {
  try {
    const AI_BASE = process.env.AI_SERVICE_URL && String(process.env.AI_SERVICE_URL).trim()
      ? String(process.env.AI_SERVICE_URL).trim()
      : 'http://localhost:8000';

    // ensure URL has protocol
    const url = AI_BASE.startsWith('http') ? AI_BASE : `https://${AI_BASE}`;

    // Ping the AI service health endpoint
    const healthUrl = `${url.replace(/\/$/, '')}/health`;
    let aiResp = null;
    try {
      const r = await axios.get(healthUrl, { timeout: 5000 });
      aiResp = { ok: true, status: r.status, data: r.data };
    } catch (err) {
      aiResp = { ok: false, error: err.message || String(err) };
    }

    return res.json({
      success: true,
      resolvedAiBase: url,
      aiHealth: aiResp,
      envAI_SERVICE_URL: process.env.AI_SERVICE_URL ?? null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
