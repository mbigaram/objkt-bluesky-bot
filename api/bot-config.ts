/**
 * Bot Configuration for Vercel Serverless Functions
 * This file handles the bot logic in a serverless environment
 */
import sharp from 'sharp';

export interface BotConfig {
  tezosAddress: string;
  blueskyHandle: string;
  blueskyPassword: string;
  customMessage: string;
  profileUrl: string;
}

export interface ObjktArtwork {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  artifactUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  price: string;
  priceXtz: number;
  timestamp: string;
}

export interface BlueskySession {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
}

const OBJKT_GRAPHQL_ENDPOINT = "https://data.objkt.com/v3/graphql";
const BLUESKY_API_URL = "https://bsky.social/xrpc";
const MAX_IMAGE_SIZE_BYTES = 976.56 * 1024; // ~1MB limit for Bluesky blobs

/**
 * Fetch user artworks from objkt.com
 */
export async function fetchUserArtworks(tezosAddress: string): Promise<ObjktArtwork[]> {
  const query = `
    query GetUserTokens($address: String!) {
      token_creator(
        where: {
          creator_address: {_eq: $address}
        }
        limit: 1000
        order_by: {token: {timestamp: desc}}
      ) {
        token {
          token_id
          name
          description
          display_uri
          artifact_uri
          thumbnail_uri
          mime
          timestamp
          fa {
            name
          }
          listings_active(
            limit: 1
            order_by: {price_xtz: asc}
          ) {
            price
            price_xtz
            currency {
              symbol
              decimals
            }
          }
        }
      }
    }
  `;

  const response = await fetch(OBJKT_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { address: tezosAddress },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  const creators = data.data?.token_creator || [];
  
  return creators
    .map((creator: any) => {
      const token = creator.token;
      const listing = token.listings_active?.[0];
      
      const convertIpfsUrl = (uri: string) => {
        if (!uri) return "";
        if (uri.startsWith("ipfs://")) {
          return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
        }
        return uri;
      };

      let priceXtz = 0;
      let priceDisplay = "Not for sale";
      
      if (listing) {
        priceXtz = listing.price_xtz / 1000000;
        priceDisplay = priceXtz.toFixed(2);
      }

      return {
        id: token.token_id,
        name: token.name || "Untitled",
        description: token.description || "",
        imageUrl: convertIpfsUrl(token.display_uri),
        artifactUrl: convertIpfsUrl(token.artifact_uri),
        thumbnailUrl: convertIpfsUrl(token.thumbnail_uri),
        mimeType: token.mime || "image/png",
        price: priceDisplay,
        priceXtz,
        timestamp: token.timestamp,
      };
    })
    .filter((artwork: ObjktArtwork) => artwork.imageUrl || artwork.thumbnailUrl || artwork.artifactUrl);
}

/**
 * Download artwork as buffer
 */
export async function downloadArtwork(url: string): Promise<Buffer> {
  let fetchUrl = url;
  if (url.startsWith("ipfs://")) {
    fetchUrl = url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  
  const response = await fetch(fetchUrl, {
    headers: {
      'Accept': 'image/*, video/*, */*'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download artwork: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Resize image if it exceeds Bluesky's limit
 */
async function processImage(buffer: Buffer): Promise<Buffer> {
  if (buffer.length <= MAX_IMAGE_SIZE_BYTES) {
    return buffer;
  }

  console.log(`Image size (${(buffer.length / 1024).toFixed(2)}KB) exceeds limit. Resizing...`);
  
  let quality = 90;
  let resizedBuffer = buffer;
  
  // First attempt: just compress
  resizedBuffer = await sharp(buffer)
    .jpeg({ quality, force: false })
    .png({ quality, force: false })
    .toBuffer();

  // If still too large, reduce dimensions and quality iteratively
  let width = undefined;
  while (resizedBuffer.length > MAX_IMAGE_SIZE_BYTES && quality > 10) {
    quality -= 10;
    const metadata = await sharp(buffer).metadata();
    const currentWidth = metadata.width || 2000;
    width = Math.floor(currentWidth * 0.8);
    
    resizedBuffer = await sharp(buffer)
      .resize({ width })
      .jpeg({ quality, force: false })
      .png({ quality, force: false })
      .toBuffer();
  }

  console.log(`Resized image to ${(resizedBuffer.length / 1024).toFixed(2)}KB`);
  return resizedBuffer;
}

/**
 * Create Bluesky session
 */
export async function createBlueskySession(
  handle: string,
  password: string
): Promise<BlueskySession> {
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
}

/**
 * Upload blob to Bluesky
 */
export async function uploadBlob(
  session: BlueskySession,
  buffer: Buffer,
  mimeType: string
): Promise<any> {
  const response = await fetch(`${BLUESKY_API_URL}/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.accessJwt}`,
      "Content-Type": mimeType,
    },
    body: buffer,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.blob;
}

/**
 * Detect facets (links) in text
 */
function detectFacets(text: string) {
  const facets: any[] = [];
  const urlRegex = /https?:\/\/[^\s\n\r]+/g;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    const end = start + url.length;

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
 * Create post on Bluesky
 */
export async function createPost(
  session: BlueskySession,
  text: string,
  buffer?: Buffer,
  mimeType?: string,
  alt?: string
): Promise<any> {
  const now = new Date().toISOString();
  
  const record: any = {
    $type: "app.bsky.feed.post",
    text: text,
    createdAt: now,
    facets: detectFacets(text),
  };

  if (buffer && mimeType) {
    let finalBuffer = buffer;
    if (mimeType.startsWith("image/")) {
      finalBuffer = await processImage(buffer);
    }

    const blobData = await uploadBlob(session, finalBuffer, mimeType);
    
    if (mimeType.startsWith("video/")) {
      record.embed = {
        $type: "app.bsky.embed.video",
        video: blobData,
        alt: alt || text,
      };
    } else {
      record.embed = {
        $type: "app.bsky.embed.images",
        images: [
          {
            alt: alt || text,
            image: blobData,
          },
        ],
      };
    }
  }

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
}

/**
 * Post a random artwork
 */
export async function postRandomArtwork(config: BotConfig): Promise<any> {
  // Authenticate with Bluesky
  const session = await createBlueskySession(config.blueskyHandle, config.blueskyPassword);
  
  // Fetch artworks
  const artworks = await fetchUserArtworks(config.tezosAddress);
  
  if (artworks.length === 0) {
    throw new Error("No artworks found for this address");
  }
  
  // Select random artwork
  const randomIndex = Math.floor(Math.random() * artworks.length);
  const artwork = artworks[randomIndex];
  
  // Build post text
  const profileLink = config.profileUrl.startsWith('http') ? config.profileUrl : `https://${config.profileUrl}`;
  const postText = `${config.customMessage}\n\n${artwork.name}\n${artwork.price} XTZ\n\n🔗 ${profileLink}`;
  
  // Download media
  let mediaBuffer: Buffer | undefined;
  let mediaMimeType: string | undefined;
  
  try {
    // Check if it's a video or image
    const isVideo = artwork.mimeType.startsWith("video/");
    const primaryUrl = isVideo ? artwork.artifactUrl : artwork.imageUrl;
    const fallbackUrl = artwork.imageUrl || artwork.thumbnailUrl;
    
    try {
      mediaBuffer = await downloadArtwork(primaryUrl);
      mediaMimeType = artwork.mimeType;
    } catch (e) {
      console.warn(`Failed to download primary media, trying fallback...`);
      if (fallbackUrl && fallbackUrl !== primaryUrl) {
        mediaBuffer = await downloadArtwork(fallbackUrl);
        mediaMimeType = "image/png";
      }
    }
  } catch (error) {
    console.warn("Could not download any media, posting text only", error);
  }
  
  // Create post
  const result = await createPost(
    session,
    postText,
    mediaBuffer,
    mediaMimeType,
    artwork.description || artwork.name
  );
  
  return {
    success: true,
    artwork: {
      id: artwork.id,
      name: artwork.name,
      price: artwork.price,
    },
    post: result,
  };
}

/**
 * Post a specific artwork by ID
 */
export async function postSpecificArtwork(config: BotConfig, artworkId: string): Promise<any> {
  // Authenticate with Bluesky
  const session = await createBlueskySession(config.blueskyHandle, config.blueskyPassword);
  
  // Fetch artworks to find the specific one
  const artworks = await fetchUserArtworks(config.tezosAddress);
  const artwork = artworks.find(a => a.id === artworkId);
  
  if (!artwork) {
    throw new Error(`Artwork with ID ${artworkId} not found`);
  }
  
  // Build post text
  const profileLink = config.profileUrl.startsWith('http') ? config.profileUrl : `https://${config.profileUrl}`;
  const postText = `${config.customMessage}\n\n${artwork.name}\n${artwork.price} XTZ\n\n🔗 ${profileLink}`;
  
  // Download media
  let mediaBuffer: Buffer | undefined;
  let mediaMimeType: string | undefined;
  
  try {
    const isVideo = artwork.mimeType.startsWith("video/");
    const primaryUrl = isVideo ? artwork.artifactUrl : artwork.imageUrl;
    const fallbackUrl = artwork.imageUrl || artwork.thumbnailUrl;
    
    try {
      mediaBuffer = await downloadArtwork(primaryUrl);
      mediaMimeType = artwork.mimeType;
    } catch (e) {
      console.warn(`Failed to download primary media, trying fallback...`);
      if (fallbackUrl && fallbackUrl !== primaryUrl) {
        mediaBuffer = await downloadArtwork(fallbackUrl);
        mediaMimeType = "image/png";
      }
    }
  } catch (error) {
    console.warn("Could not download any media, posting text only", error);
  }
  
  // Create post
  const result = await createPost(
    session,
    postText,
    mediaBuffer,
    mediaMimeType,
    artwork.description || artwork.name
  );
  
  return {
    success: true,
    artwork: {
      id: artwork.id,
      name: artwork.name,
      price: artwork.price,
    },
    post: result,
  };
}
