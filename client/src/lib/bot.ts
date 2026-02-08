/**
 * Bot Scheduler and Logic
 * Handles scheduling and posting automation
 */

import { fetchUserArtworks, downloadArtwork, ObjktArtwork } from "./objkt";
import { createBlueskySession, createPost, BlueskySession } from "./bluesky";

export interface BotConfig {
  tezosAddress: string;
  blueskyHandle: string;
  blueskyPassword: string;
  customMessage: string;
  profileUrl: string;
  schedules: Array<{
    id: number;
    time: string;
    enabled: boolean;
    message?: string;
  }>;
}

export interface BotStatus {
  isActive: boolean;
  lastPost?: Date;
  nextPost?: Date;
  totalPosts: number;
  errors: string[];
}

export class ObjktBlueskyBot {
  private config: BotConfig;
  private status: BotStatus;
  private intervalId?: number;
  private artworks: ObjktArtwork[] = [];
  private session?: BlueskySession;
  private lastPostedMinute: string = "";

  constructor(config: BotConfig) {
    this.config = config;
    this.status = {
      isActive: false,
      totalPosts: 0,
      errors: [],
    };
  }

  async start(): Promise<void> {
    if (this.status.isActive) {
      throw new Error("Bot is already running");
    }

    try {
      this.session = await createBlueskySession(
        this.config.blueskyHandle,
        this.config.blueskyPassword
      );

      this.artworks = await fetchUserArtworks(this.config.tezosAddress);
      
      if (this.artworks.length === 0) {
        throw new Error("No artworks found for this address");
      }

      this.calculateNextPostTime();
      this.startScheduler();
      this.status.isActive = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.status.errors.push(errorMessage);
      throw error;
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.status.isActive = false;
  }

  getStatus(): BotStatus {
    return { ...this.status };
  }

  getArtworks(): ObjktArtwork[] {
    return [...this.artworks];
  }

  private calculateNextPostTime(): void {
    const now = new Date();
    const enabledSchedules = this.config.schedules.filter(s => s.enabled);
    
    if (enabledSchedules.length === 0) {
      this.status.nextPost = undefined;
      return;
    }

    let nextTime: Date | null = null;
    
    for (const schedule of enabledSchedules) {
      const [hours, minutes] = schedule.time.split(":").map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      if (!nextTime || scheduledTime < nextTime) {
        nextTime = scheduledTime;
      }
    }

    this.status.nextPost = nextTime || undefined;
  }

  private startScheduler(): void {
    this.intervalId = window.setInterval(() => {
      this.checkAndPost();
    }, 30000);
    this.checkAndPost();
  }

  private async checkAndPost(): Promise<void> {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    if (this.lastPostedMinute === currentTime) {
      return;
    }

    const matchingSchedule = this.config.schedules.find(
      s => s.enabled && s.time === currentTime
    );

    if (matchingSchedule) {
      this.lastPostedMinute = currentTime;
      try {
        await this.postNextArtwork(matchingSchedule);
        this.calculateNextPostTime();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.status.errors.push(errorMessage);
        console.error("Error posting artwork:", error);
      }
    }
  }

  /**
   * Post the next artwork with support for MP4 and Images
   */
  private async postNextArtwork(schedule?: any): Promise<void> {
    if (!this.session) throw new Error("Not authenticated");
    if (this.artworks.length === 0) throw new Error("No artworks available");

    const randomIndex = Math.floor(Math.random() * this.artworks.length);
    const artwork = this.artworks[randomIndex];
    
    await this.executePost(artwork, schedule?.message || this.config.customMessage);
  }

  /**
   * Manually post an artwork
   */
  async postArtwork(artworkId: string): Promise<void> {
    console.log("Bot: Manual post requested for ID:", artworkId);
    
    // 1. Ensure we have artworks loaded
    if (!this.artworks || this.artworks.length === 0) {
      console.log("Bot: No artworks in memory, fetching from API...");
      this.artworks = await fetchUserArtworks(this.config.tezosAddress);
    }

    // 2. Find the EXACT artwork
    // We use String() to avoid type mismatch and trim to avoid whitespace issues
    const targetId = String(artworkId).trim();
    const artwork = this.artworks.find(a => String(a.id).trim() === targetId);
    
    if (!artwork) {
      console.error("Bot: CRITICAL - Artwork not found! Requested ID:", targetId);
      console.log("Bot: Available IDs in memory:", this.artworks.map(a => a.id).slice(0, 10), "...");
      throw new Error(`Artwork not found. Please try refreshing the collection.`);
    }

    console.log("Bot: SUCCESS - Found artwork to post:", artwork.name, "(ID:", artwork.id, ")");
    
    // 3. Ensure session is active
    if (!this.session) {
      console.log("Bot: No session, authenticating...");
      this.session = await createBlueskySession(
        this.config.blueskyHandle,
        this.config.blueskyPassword
      );
    }

    // 4. Execute the post with the SPECIFIC artwork
    // We call executePost directly with the found artwork object
    await this.executePost(artwork, this.config.customMessage);
    console.log("Bot: Manual post execution finished for:", artwork.name);
  }

  /**
   * Core logic to handle download and post execution
   */
  private async executePost(artwork: ObjktArtwork, message: string): Promise<void> {
    if (!this.session) return;

    const profileLink = this.config.profileUrl.startsWith('http') ? this.config.profileUrl : `https://${this.config.profileUrl}`;
    const postText = `${message}\n\n${artwork.name}\n${artwork.price} XTZ\n\n🔗 ${profileLink}`;

    let mediaBlob: Blob | undefined;
    let mediaMimeType: string | undefined;

    try {
      /**
       * Lógica de Seleção de Mídia:
       * 1. Se for MP4, tenta baixar o artifactUrl original.
       * 2. Se falhar ou não for MP4, usa a imageUrl (display_uri) como fallback.
       */
      const isVideo = artwork.mimeType === "video/mp4";
      const primaryUrl = isVideo ? artwork.artifactUrl : artwork.imageUrl;
      const fallbackUrl = artwork.imageUrl || artwork.thumbnailUrl;

      try {
        mediaBlob = await downloadArtwork(primaryUrl);
        mediaMimeType = mediaBlob.type || (isVideo ? "video/mp4" : "image/png");
      } catch (e) {
        console.warn(`Failed to download primary media (${primaryUrl}), trying fallback...`);
        if (fallbackUrl && fallbackUrl !== primaryUrl) {
          mediaBlob = await downloadArtwork(fallbackUrl);
          mediaMimeType = mediaBlob.type || "image/png";
        }
      }

      // Validação final do Mime Type para o Bluesky
      if (mediaMimeType && !mediaMimeType.startsWith("image/") && !mediaMimeType.startsWith("video/mp4")) {
        // Se for um formato não suportado (ex: GLB), tenta forçar a imagem de preview
        if (fallbackUrl) {
          mediaBlob = await downloadArtwork(fallbackUrl);
          mediaMimeType = mediaBlob.type || "image/png";
        }
      }
    } catch (error) {
      console.warn("Could not download any media, posting text only", error);
    }

    await createPost(this.session, {
      text: postText,
      blob: mediaBlob,
      mimeType: mediaMimeType,
      alt: artwork.description || artwork.name,
    });

    this.status.lastPost = new Date();
    this.status.totalPosts++;
  }
}
