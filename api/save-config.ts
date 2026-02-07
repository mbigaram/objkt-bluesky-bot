/**
 * Vercel Serverless Function - Save Bot Configuration
 * Endpoint: /api/save-config
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = req.body;

    // Basic validation
    if (!config.tezosAddress || !config.blueskyHandle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save to Vercel KV
    // We use a fixed key for simplicity, or could use the tezosAddress as part of the key
    await kv.set('bot_config', config);

    return res.status(200).json({
      success: true,
      message: 'Configuration saved successfully',
    });

  } catch (error) {
    console.error('Error saving config:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
