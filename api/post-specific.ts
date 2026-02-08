/**
 * Vercel Serverless Function - Post Specific Artwork
 * Endpoint: /api/post-specific
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { postSpecificArtwork } from './bot-config';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { artworkId } = req.body;

  if (!artworkId) {
    return res.status(400).json({ error: 'Missing artworkId' });
  }

  try {
    // Get config from KV
    const config: any = await kv.get('bot_config');

    if (!config) {
      return res.status(400).json({ error: 'Bot not configured in cloud' });
    }

    const finalConfig = {
      tezosAddress: config.tezosAddress || process.env.TEZOS_ADDRESS,
      blueskyHandle: config.blueskyHandle || process.env.BLUESKY_HANDLE,
      blueskyPassword: config.blueskyPassword || process.env.BLUESKY_PASSWORD,
      customMessage: config.customMessage || process.env.CUSTOM_MESSAGE,
      profileUrl: config.profileUrl || process.env.PROFILE_URL,
    };

    const result = await postSpecificArtwork(finalConfig as any, artworkId);

    return res.status(200).json({
      success: true,
      message: 'Specific artwork posted successfully',
      data: result
    });

  } catch (error) {
    console.error('Error posting specific artwork:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
