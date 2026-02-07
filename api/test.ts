/**
 * Vercel Serverless Function - Test Configuration
 * Endpoint: /api/test
 * 
 * This function allows you to test your configuration without posting
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchUserArtworks, createBlueskySession, BotConfig } from './bot-config';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config: BotConfig = {
      tezosAddress: process.env.TEZOS_ADDRESS || '',
      blueskyHandle: process.env.BLUESKY_HANDLE || '',
      blueskyPassword: process.env.BLUESKY_PASSWORD || '',
      customMessage: process.env.CUSTOM_MESSAGE || '',
      profileUrl: process.env.PROFILE_URL || '',
    };

    // Validate configuration
    if (!config.tezosAddress || !config.blueskyHandle || !config.blueskyPassword) {
      return res.status(400).json({ 
        error: 'Missing required environment variables',
        required: ['TEZOS_ADDRESS', 'BLUESKY_HANDLE', 'BLUESKY_PASSWORD'],
        current: {
          tezosAddress: !!config.tezosAddress,
          blueskyHandle: !!config.blueskyHandle,
          blueskyPassword: !!config.blueskyPassword,
        }
      });
    }

    // Test Bluesky authentication
    let blueskyStatus = 'not tested';
    try {
      await createBlueskySession(config.blueskyHandle, config.blueskyPassword);
      blueskyStatus = 'authenticated';
    } catch (error) {
      blueskyStatus = `failed: ${error instanceof Error ? error.message : 'unknown error'}`;
    }

    // Test Vercel KV
    let kvConfig: any = null;
    try {
      const { kv } = await import('@vercel/kv');
      kvConfig = await kv.get('bot_config');
    } catch (e) {
      console.error('KV not connected');
    }

    // Test objkt.com API
    let artworksCount = 0;
    let objktStatus = 'not tested';
    const testAddress = kvConfig?.tezosAddress || config.tezosAddress;
    if (testAddress) {
      try {
        const artworks = await fetchUserArtworks(testAddress);
        artworksCount = artworks.length;
        objktStatus = 'success';
      } catch (error) {
        objktStatus = `failed: ${error instanceof Error ? error.message : 'unknown error'}`;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Configuration test completed',
      envConfig: {
        tezosAddress: config.tezosAddress,
        blueskyHandle: config.blueskyHandle,
      },
      cloudConfig: kvConfig,
      tests: {
        bluesky: blueskyStatus,
        objkt: objktStatus,
        artworksFound: artworksCount,
        kvConnected: !!kvConfig
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error testing configuration:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
