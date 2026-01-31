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
  private lastPostedMinute: string = ""; // Evita múltiplas postagens no mesmo minuto

  constructor(config: BotConfig) {
    this.config = config;
    this.status = {
      isActive: false,
      totalPosts: 0,
      errors: [],
    };
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (this.status.isActive) {
      throw new Error("Bot is already running");
    }

    try {
      // Authenticate with Bluesky
      this.session = await createBlueskySession(
        this.config.blueskyHandle,
        this.config.blueskyPassword
      );

      // Fetch artworks from objkt.com
      this.artworks = await fetchUserArtworks(this.config.tezosAddress);
      
      if (this.artworks.length === 0) {
        throw new Error("No artworks found for this address");
      }

      // Calculate next post time
      this.calculateNextPostTime();

      // Start the scheduler
      this.startScheduler();

      this.status.isActive = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.status.errors.push(errorMessage);
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.status.isActive = false;
  }

  /**
   * Get current status
   */
  getStatus(): BotStatus {
    return { ...this.status };
  }

  /**
   * Get artworks
   */
  getArtworks(): ObjktArtwork[] {
    return [...this.artworks];
  }

  /**
   * Calculate next post time based on schedule
   */
  private calculateNextPostTime(): void {
    const now = new Date();
    const enabledSchedules = this.config.schedules.filter(s => s.enabled);
    
    if (enabledSchedules.length === 0) {
      this.status.nextPost = undefined;
      return;
    }

    // Find the next scheduled time
    let nextTime: Date | null = null;
    
    for (const schedule of enabledSchedules) {
      const [hours, minutes] = schedule.time.split(":").map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      // Se o horário já passou hoje, agenda para amanhã
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      if (!nextTime || scheduledTime < nextTime) {
        nextTime = scheduledTime;
      }
    }

    this.status.nextPost = nextTime || undefined;
  }

  /**
   * Start the scheduler
   */
  private startScheduler(): void {
    // Verifica a cada 30 segundos para maior precisão
    this.intervalId = window.setInterval(() => {
      this.checkAndPost();
    }, 30000);

    // Também verifica imediatamente
    this.checkAndPost();
  }

  /**
   * Check if it's time to post and post if needed
   */
  private async checkAndPost(): Promise<void> {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    // Evita postar mais de uma vez no mesmo minuto
    if (this.lastPostedMinute === currentTime) {
      return;
    }

    // Check if current time matches any enabled schedule
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
   * Post the next artwork
   */
  private async postNextArtwork(schedule?: any): Promise<void> {
    if (!this.session) {
      throw new Error("Not authenticated");
    }

    if (this.artworks.length === 0) {
      throw new Error("No artworks available");
    }

    // Get a random artwork
    const randomIndex = Math.floor(Math.random() * this.artworks.length);
    const artwork = this.artworks[randomIndex];

    // Build the post text
    const message = schedule?.message || this.config.customMessage;
    const profileLink = this.config.profileUrl.startsWith('http') ? this.config.profileUrl : `https://${this.config.profileUrl}`;
    const postText = `${message}\n\n${artwork.name}\n${artwork.price} XTZ\n\n🔗 ${profileLink}`;

    // Download the artwork
    let imageBlob: Blob | undefined;
    let imageMimeType: string | undefined;

    try {
      const imageUrl = artwork.imageUrl || artwork.thumbnailUrl || artwork.artifactUrl;
      
      if (imageUrl) {
        imageBlob = await downloadArtwork(imageUrl);
        imageMimeType = imageBlob.type || artwork.mimeType;

        if (!imageMimeType || !imageMimeType.startsWith("image/")) {
           if (imageBlob.size > 0) {
             imageMimeType = "image/png";
           } else {
             imageBlob = undefined;
             imageMimeType = undefined;
           }
        }
      }
    } catch (error) {
      console.warn("Could not download artwork image, posting text only", error);
    }

    // Create the post
    await createPost(this.session, {
      text: postText,
      imageBlob,
      imageMimeType,
      imageAlt: artwork.description || artwork.name,
    });

    // Update status
    this.status.lastPost = new Date();
    this.status.totalPosts++;
  }

  /**
   * Manually post an artwork
   */
  async postArtwork(artworkId: string): Promise<void> {
    if (!this.session) {
      throw new Error("Not authenticated");
    }

    const artwork = this.artworks.find(a => a.id === artworkId);
    if (!artwork) {
      throw new Error("Artwork not found");
    }

    const profileLink = this.config.profileUrl.startsWith('http') ? this.config.profileUrl : `https://${this.config.profileUrl}`;
    const postText = `${this.config.customMessage}\n\n${artwork.name}\n${artwork.price} XTZ\n\n🔗 ${profileLink}`;

    let imageBlob: Blob | undefined;
    let imageMimeType: string | undefined;

    try {
      const imageUrl = artwork.imageUrl || artwork.thumbnailUrl || artwork.artifactUrl;
      
      if (imageUrl) {
        imageBlob = await downloadArtwork(imageUrl);
        imageMimeType = imageBlob.type || artwork.mimeType;

        if (!imageMimeType || !imageMimeType.startsWith("image/")) {
           if (imageBlob.size > 0) {
             imageMimeType = "image/png";
           } else {
             imageBlob = undefined;
             imageMimeType = undefined;
           }
        }
      }
    } catch (error) {
      console.warn("Could not download artwork image, posting text only", error);
    }

    await createPost(this.session, {
      text: postText,
      imageBlob,
      imageMimeType,
      imageAlt: artwork.description || artwork.name,
    });

    this.status.lastPost = new Date();
    this.status.totalPosts++;
  }
}
