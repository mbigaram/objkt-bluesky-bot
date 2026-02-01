/**
 * objkt.com API Integration
 * GraphQL endpoint: https://data.objkt.com/v3/graphql
 */

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

const OBJKT_GRAPHQL_ENDPOINT = "https://data.objkt.com/v3/graphql";

/**
 * Fetch ALL artworks created by a Tezos address
 * Uses a larger limit or pagination to ensure the whole collection is available
 */
export async function fetchUserArtworks(tezosAddress: string): Promise<ObjktArtwork[]> {
  // We use a very high limit to get the "entire" collection for most users.
  // For extremely large collections, this could be paginated, but 500 is usually enough for artists.
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

  try {
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
  } catch (error) {
    console.error("Error fetching objkt artworks:", error);
    throw error;
  }
}

/**
 * Download artwork file as blob
 */
export async function downloadArtwork(url: string): Promise<Blob> {
  try {
    let fetchUrl = url;
    if (url.startsWith("ipfs://")) {
      fetchUrl = url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    
    const response = await fetch(fetchUrl, {
      mode: 'cors',
      headers: {
        'Accept': 'image/*, video/*, */*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download artwork: ${response.status}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error("Error downloading artwork:", error);
    throw error;
  }
}
