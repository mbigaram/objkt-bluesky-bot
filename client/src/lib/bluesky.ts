/**
 * Bluesky (AT Protocol) API Integration
 * API endpoint: https://bsky.social/xrpc
 */

export interface BlueskySession {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
}

export interface BlueskyPost {
  text: string;
  blob?: Blob;
  mimeType?: string;
  alt?: string;
}

const BLUESKY_API_URL = "https://bsky.social/xrpc";

/**
 * Helper to detect facets (links) in text
 */
function detectFacets(text: string) {
  const facets: any[] = [];
  const urlRegex = /https?:\/\/[^\s\n\r]+/g;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    const end = start + url.length;

    // Bluesky uses byte offsets for facets, not character offsets
    const textBefore = text.slice(0, start);
    const textMatch = text.slice(start, end);
    
    const byteStart = new TextEncoder().encode(textBefore).byteLength;
    const byteEnd = byteStart + new TextEncoder().encode(textMatch).byteLength;

    facets.push({
      index: {
        byteStart,
        byteEnd,
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: url,
        },
      ],
    });
  }

  return facets.length > 0 ? facets : undefined;
}

/**
 * Create a session with Bluesky
 */
export async function createBlueskySession(
  handle: string,
  password: string
): Promise<BlueskySession> {
  try {
    const response = await fetch(`${BLUESKY_API_URL}/com.atproto.server.createSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: handle,
        password: password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt,
      did: data.did,
      handle: data.handle,
    };
  } catch (error) {
    console.error("Error creating Bluesky session:", error);
    throw error;
  }
}

/**
 * Upload a blob (image/video) to Bluesky
 */
export async function uploadBlob(
  session: BlueskySession,
  blob: Blob,
  mimeType: string
): Promise<any> {
  try {
    const response = await fetch(`${BLUESKY_API_URL}/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.accessJwt}`,
        "Content-Type": mimeType,
      },
      body: blob,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.blob;
  } catch (error) {
    console.error("Error uploading blob:", error);
    throw error;
  }
}

/**
 * Create a post on Bluesky with support for Images and Videos
 */
export async function createPost(
  session: BlueskySession,
  post: BlueskyPost
): Promise<any> {
  try {
    const now = new Date().toISOString();
    
    // Build the post record
    const record: any = {
      $type: "app.bsky.feed.post",
      text: post.text,
      createdAt: now,
      facets: detectFacets(post.text),
    };

    // Handle Media (Image or Video)
    if (post.blob && post.mimeType) {
      const blobData = await uploadBlob(session, post.blob, post.mimeType);
      
      if (post.mimeType.startsWith("video/")) {
        // Video Embed
        record.embed = {
          $type: "app.bsky.embed.video",
          video: blobData,
          alt: post.alt || post.text,
        };
      } else {
        // Image Embed
        record.embed = {
          $type: "app.bsky.embed.images",
          images: [
            {
              alt: post.alt || post.text,
              image: blobData,
            },
          ],
        };
      }
    }

    // Create the post
    const response = await fetch(`${BLUESKY_API_URL}/com.atproto.repo.createRecord`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.accessJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        record: record,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Post creation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

/**
 * Test authentication
 */
export async function testAuthentication(
  handle: string,
  password: string
): Promise<boolean> {
  try {
    await createBlueskySession(handle, password);
    return true;
  } catch (error) {
    return false;
  }
}
