/**
 * Vercel Serverless Function - Post to Bluesky (Dynamic)
 * Endpoint: /api/post
 * 
 * This function runs every minute and checks if there's a scheduled post
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { postRandomArtwork } from './bot-config';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // 1. Get dynamic config from KV
    const config: any = await kv.get('bot_config');

    if (!config || !config.isActive) {
      return res.status(200).json({ message: 'Bot is inactive or not configured' });
    }

    // 2. Check if current time matches any enabled schedule
    const now = new Date();
    // Adjust to user's timezone if needed, but usually we compare in UTC or fixed offset
    // For simplicity, we'll assume the site saves times in a way we can compare
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    const matchingSchedule = config.schedules?.find(
      (s: any) => s.enabled && s.time === currentTime
    );

    if (!matchingSchedule) {
      return res.status(200).json({ 
        message: 'No post scheduled for this minute',
        currentTime 
      });
    }

    // 3. Prevent double posting in the same minute (KV as lock)
    const lockKey = `post_lock:${currentTime}`;
    const alreadyPosted = await kv.get(lockKey);
    if (alreadyPosted) {
      return res.status(200).json({ message: 'Already posted for this minute' });
    }
    await kv.set(lockKey, true, { ex: 65 }); // Lock for 65 seconds

    // 4. Execute post
    // Merge KV config with Environment Variables (Env vars act as defaults/secrets)
    const finalConfig = {
      tezosAddress: config.tezosAddress || process.env.TEZOS_ADDRESS,
      blueskyHandle: config.blueskyHandle || process.env.BLUESKY_HANDLE,
      blueskyPassword: config.blueskyPassword || process.env.BLUESKY_PASSWORD,
      customMessage: matchingSchedule.message || config.customMessage || process.env.CUSTOM_MESSAGE,
      profileUrl: config.profileUrl || process.env.PROFILE_URL,
    };

    const result = await postRandomArtwork(finalConfig as any);

    return res.status(200).json({
      success: true,
      message: 'Dynamic post created successfully',
      data: result
    });

  } catch (error) {
    console.error('Error in dynamic post:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
