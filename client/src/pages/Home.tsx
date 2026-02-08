/**
 * Neo-Brutalist Design - ENGLISH VERSION
 * - Colors: #fff200 (Yellow), #ff6b00 (Orange)
 * - Style: Hard edges, black borders, solid shadows
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Clock, Image as ImageIcon, Calendar, Settings, Activity, Loader2, Trash2, Heart, Copy, Maximize2, X, ExternalLink, HelpCircle } from "lucide-react";
import { ObjktBlueskyBot, BotConfig } from "@/lib/bot";
import { ObjktArtwork } from "@/lib/objkt";

interface ScheduleTime {
  id: number;
  time: string;
  enabled: boolean;
  message?: string;
}

const DEFAULT_SCHEDULES: ScheduleTime[] = [
  { id: 1, time: "09:00", enabled: true },
  { id: 2, time: "13:00", enabled: true },
  { id: 3, time: "17:00", enabled: true },
  { id: 4, time: "21:00", enabled: true },
];

const DONATION_ART_URL = "https://ipfs.io/ipfs/bafybeie2otqlyx5p5pqfew464h5rutibrvrnnpcxkw6yzdoi5w2zu2rqvi";
const QR_CODE_ONLY_URL = "https://github.com/user-attachments/assets/4758e44e-c573-4546-9c9a-d5dd62ebbb7c";
const SOCIAL_ART_URL = "https://github.com/user-attachments/assets/e6184885-3e67-4153-a5c8-b6ec01143fb6";
const TEZOS_WALLET_1 = "tz1RYMi13Yp4tmZ9ibt2yX9G7XC7qkEz31tg";

// Tooltip texts
const TOOLTIPS = {
  tezosAddress: "Your Tezos wallet address (tz1...) that contains your NFTs on objkt.com",
  blueskyHandle: "Your complete Bluesky handle (e.g., user.bsky.social) - Do NOT include the @",
  appPassword: "Generate a secure App Password in your Bluesky settings (Settings → App Passwords) instead of using your main password",
  customMessage: "This message will appear in every post. Format: [Your Message] - [Art Name] - [Price] XTZ",
  profileLink: "Optional: Link to your profile (e.g., https://objkt.com/profile/...)",
  scheduleTime: "Set the time when the bot will automatically post your art",
  scheduleMessage: "Optional: Custom message for this specific schedule slot"
};

// Helper component for label with tooltip
const LabelWithTooltip = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <div className="flex items-center gap-2">
    <Label className="text-[#fff200] font-black uppercase text-xs tracking-widest">{label}</Label>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="inline-flex items-center justify-center w-5 h-5 bg-[#fff200] text-black rounded-full hover:bg-white transition-colors">
          <HelpCircle className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="bg-black border-2 border-[#fff200] text-[#fff200] font-bold max-w-xs text-left">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </div>
);

export default function Home() {
  const [tezosAddress, setTezosAddress] = useState("");
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPassword, setBlueskyPassword] = useState("");
  const [customMessage, setCustomMessage] = useState("Good morning! ☀️");
  const [profileUrl, setProfileUrl] = useState("");
  const [schedules, setSchedules] = useState<ScheduleTime[]>(DEFAULT_SCHEDULES);

  const [isConfigured, setIsConfigured] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [artworks, setArtworks] = useState<ObjktArtwork[]>([]);
  const [nextPost, setNextPost] = useState<string>("");
  const [totalPosts, setTotalPosts] = useState(0);
  const [lastPost, setLastPost] = useState<Date | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const botRef = useRef<ObjktBlueskyBot | null>(null);

  useEffect(() => {
    const savedConfig = sessionStorage.getItem("botConfig");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.tezosAddress) setTezosAddress(config.tezosAddress);
        if (config.blueskyHandle) setBlueskyHandle(config.blueskyHandle);
        if (config.blueskyPassword) setBlueskyPassword(config.blueskyPassword);
        if (config.customMessage) setCustomMessage(config.customMessage);
        if (config.profileUrl) setProfileUrl(config.profileUrl);
        if (config.schedules && Array.isArray(config.schedules)) {
          setSchedules(config.schedules);
        }
        setIsConfigured(true);
      } catch (error) {
        console.error("Error loading config:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive && botRef.current) {
      const interval = setInterval(() => {
        const status = botRef.current?.getStatus();
        if (status?.nextPost) {
          const now = new Date();
          const next = new Date(status.nextPost);
          const diff = next.getTime() - now.getTime();
          if (diff > 0) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
            setNextPost(`In ${hours}h ${minutes}m`);
          }
        }
        if (status?.lastPost) setLastPost(new Date(status.lastPost));
        if (status?.totalPosts !== undefined) setTotalPosts(status.totalPosts);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const handleSaveConfig = async () => {
    if (!tezosAddress || !blueskyHandle || !blueskyPassword) {
      toast.error("Please fill in all required fields");
      return;
    }
    const config = { tezosAddress, blueskyHandle, blueskyPassword, customMessage, profileUrl, schedules, isActive };
    
    // Save locally
    sessionStorage.setItem("botConfig", JSON.stringify(config));
    setIsConfigured(true);

    // Save to Vercel KV via API
    setIsLoading(true);
    try {
      const response = await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) throw new Error('Failed to save to cloud');
      
      toast.success("Settings saved to cloud!");
    } catch (error) {
      console.error("Error saving to KV:", error);
      toast.error("Saved locally, but failed to sync with cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    if (isActive) {
      toast.error("Please deactivate the bot first");
      return;
    }
    if (confirm("Delete all session data?")) {
      sessionStorage.removeItem("botConfig");
      window.location.reload();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const updateScheduleField = (id: number, field: keyof ScheduleTime, value: any) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleActivateBot = async () => {
    const newActiveState = !isActive;
    
    if (isActive) {
      botRef.current?.stop();
      botRef.current = null;
      setIsActive(false);
      setArtworks([]);
    } else {
      setIsLoading(true);
      try {
        const config: BotConfig = { tezosAddress, blueskyHandle, blueskyPassword, customMessage, profileUrl, schedules };
        const bot = new ObjktBlueskyBot(config);
        await bot.start();
        botRef.current = bot;
        setIsActive(true);
        setArtworks(bot.getArtworks());
        toast.success("Bot started locally!");
      } catch (error) {
        toast.error(`Error: ${error instanceof Error ? error.message : "Failed to start"}`);
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    // Sync active state with cloud
    try {
      const config = { tezosAddress, blueskyHandle, blueskyPassword, customMessage, profileUrl, schedules, isActive: newActiveState };
      await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      toast.success(newActiveState ? "Cloud bot activated!" : "Cloud bot deactivated!");
    } catch (error) {
      toast.error("Failed to sync status with cloud.");
    }
  };

  const handleTestPost = async (artworkId: string) => {
    console.log("Post Now clicked for artworkId:", artworkId);
    setIsLoading(true);
    
    // 1. Try to post locally if bot is active
    let localSuccess = false;
    if (botRef.current) {
      try {
        console.log("Attempting local post via botRef...");
        await botRef.current.postArtwork(artworkId);
        localSuccess = true;
        toast.success("Post sent from browser!");
      } catch (error) {
        console.error("Local post failed:", error);
      }
    }

    // 2. Also trigger cloud post to ensure it works 24h
    try {
      console.log("Attempting cloud post via /api/post-specific...");
      const response = await fetch('/api/post-specific', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId }),
      });
      
      const result = await response.json();
      console.log("Cloud post response:", result);

      if (response.ok) {
        if (!localSuccess) toast.success("Post sent from cloud!");
      } else {
        if (!localSuccess) throw new Error(result.error || 'Cloud post failed');
      }
    } catch (error) {
      console.error("Cloud post failed:", error);
      if (!localSuccess) toast.error(`Failed to post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#fff200] selection:text-black">
      {/* Lightbox - FOCUS ON QR CODE */}
      {isZoomed && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
          <Button className="absolute top-6 right-6 bg-[#fff200] text-black border-2 border-black hover:bg-white" onClick={() => setIsZoomed(false)}>
            <X className="w-6 h-6" />
          </Button>
          <div className="w-full max-w-2xl flex flex-col items-center gap-8">
            <h2 className="text-3xl font-black text-[#ff6b00] italic uppercase tracking-tighter">Support QR Code</h2>
            <div className="relative w-80 h-80 border-8 border-[#ff6b00] bg-white shadow-[0_0_50px_rgba(255,107,0,0.5)]">
              <img 
                src={QR_CODE_ONLY_URL} 
                alt="QR Code Zoom" 
                className="w-full h-full object-contain" 
              />
            </div>
            <p className="text-center text-white font-bold max-w-sm">Scan the QR code above to support the project via Tezos.</p>
            <Button 
              onClick={(e) => { e.stopPropagation(); copyToClipboard(TEZOS_WALLET_1, "Address"); }} 
              className="w-full max-w-xs bg-white text-black font-black border-4 border-[#ff6b00] h-14 uppercase italic"
            >
              Copy Wallet Address
            </Button>
          </div>
        </div>
      )}

      <header className="border-b-4 border-[#fff200] bg-[#0A0A0A] sticky top-0 z-50">
        <div className="container py-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-[#fff200] italic uppercase tracking-tighter">objkt <span className="text-white">→</span> Bluesky</h1>
            <p className="text-[#fff200]/70 font-mono text-[10px] mt-1 uppercase tracking-[0.2em] font-bold">The Ultimate Art Automator</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleClearData} className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black uppercase text-xs rounded-none">
              <Trash2 className="w-4 h-4 mr-2" /> Clear Data
            </Button>
            {isActive && (
              <div className="flex items-center gap-2 bg-[#fff200] border-2 border-black px-4 py-2 rounded-none shadow-[4px_4px_0px_0px_rgba(255,242,0,0.4)]">
                <Activity className="w-5 h-5 text-black animate-pulse" />
                <span className="font-black text-black text-xs uppercase">Bot Active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Donation Section - ORANGE CARD */}
            <Card className="p-8 border-4 border-[#ff6b00] bg-[#ff6b00]/5 shadow-[12px_12px_0px_0px_rgba(255,107,0,1)] rounded-none relative group">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0 w-full md:w-2/5 relative">
                  <div className="border-4 border-[#ff6b00] bg-black cursor-zoom-in relative group" onClick={() => setIsZoomed(true)}>
                    <img src={DONATION_ART_URL} alt="Donation Art" className="w-full h-auto object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    <div className="absolute inset-0 bg-[#ff6b00]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <Maximize2 className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#ff6b00] font-black mt-2 text-center uppercase tracking-widest">Click to view QR Code</p>
                </div>
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <Heart className="w-8 h-8 text-[#ff6b00] fill-[#ff6b00]" />
                    <h2 className="text-3xl font-black text-white uppercase italic">Support the Bot</h2>
                  </div>
                  <p className="text-white/80 leading-relaxed font-bold">
                    This bot automates your entire collection! If it helps you, please consider supporting the development. Scan the QR or copy the address below:
                  </p>
                  <Button 
                    onClick={() => copyToClipboard(TEZOS_WALLET_1, "Address")}
                    className="w-full justify-between bg-[#ff6b00] hover:bg-white hover:text-[#ff6b00] text-black font-black border-4 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all uppercase italic h-14"
                  >
                    <span>COPY TZ1...31TG</span>
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Config Section - YELLOW CARD */}
            <Card className="p-8 border-4 border-[#fff200] bg-[#111] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-none">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-[#fff200] flex items-center justify-center border-4 border-black">
                  <Settings className="w-7 h-7 text-black" />
                </div>
                <h2 className="text-3xl font-black uppercase italic text-white">Settings</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <LabelWithTooltip label="Tezos Address" tooltip={TOOLTIPS.tezosAddress} />
                  <Input value={tezosAddress} onChange={(e) => setTezosAddress(e.target.value)} placeholder="tz1..." className="bg-black border-4 border-[#fff200] text-white rounded-none h-14 focus:ring-0 font-bold" disabled={isActive} />
                </div>
                <div className="space-y-3">
                  <LabelWithTooltip label="Bluesky Handle" tooltip={TOOLTIPS.blueskyHandle} />
                  <Input value={blueskyHandle} onChange={(e) => setBlueskyHandle(e.target.value)} placeholder="user.bsky.social" className="bg-black border-4 border-[#fff200] text-white rounded-none h-14 focus:ring-0 font-bold" disabled={isActive} />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <LabelWithTooltip label="App Password" tooltip={TOOLTIPS.appPassword} />
                  <Input type="password" value={blueskyPassword} onChange={(e) => setBlueskyPassword(e.target.value)} placeholder="••••-••••-••••-••••" className="bg-black border-4 border-[#fff200] text-white rounded-none h-14 focus:ring-0 font-bold" disabled={isActive} />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <LabelWithTooltip label="Custom Message" tooltip={TOOLTIPS.customMessage} />
                  <Input value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Good morning! ☀️" className="bg-black border-4 border-[#fff200] text-white rounded-none h-14 focus:ring-0 font-bold" disabled={isActive} />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <LabelWithTooltip label="Profile Link (Optional)" tooltip={TOOLTIPS.profileLink} />
                  <Input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://objkt.com/profile/..." className="bg-black border-4 border-[#fff200] text-white rounded-none h-14 focus:ring-0 font-bold" disabled={isActive} />
                </div>
              </div>
              <Button onClick={handleSaveConfig} disabled={isActive} className="w-full mt-10 h-16 bg-[#fff200] text-black font-black text-xl border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase italic">
                Save Configuration
              </Button>
            </Card>

            {/* Schedules Section */}
            <Card className="p-8 border-4 border-white bg-[#111] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-none">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-white flex items-center justify-center border-4 border-black">
                  <Clock className="w-7 h-7 text-black" />
                </div>
                <h2 className="text-3xl font-black uppercase italic text-white">Schedules</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {schedules.map((s) => (
                  <div key={`s-${s.id}`} className={`p-6 border-4 transition-all ${s.enabled ? 'border-[#fff200] bg-[#fff200]/5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'border-[#333] bg-black opacity-40'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-black text-white italic uppercase">Slot {s.id}</span>
                      <Switch checked={s.enabled} onCheckedChange={(val) => updateScheduleField(s.id, 'enabled', val)} disabled={isActive} className="data-[state=checked]:bg-[#fff200]" />
                    </div>
                    <div className="space-y-3 mb-4">
                      <LabelWithTooltip label="Time" tooltip={TOOLTIPS.scheduleTime} />
                      <Input type="time" value={s.time} onChange={(e) => updateScheduleField(s.id, 'time', e.target.value)} disabled={!s.enabled || isActive} className="bg-black border-2 border-white text-white font-mono rounded-none h-12" />
                    </div>
                    <div className="space-y-3">
                      <LabelWithTooltip label="Message (Optional)" tooltip={TOOLTIPS.scheduleMessage} />
                      <Input placeholder="Custom post message..." value={s.message || ''} onChange={(e) => updateScheduleField(s.id, 'message', e.target.value)} disabled={!s.enabled || isActive} className="bg-black border-2 border-white/40 text-white rounded-none" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-10">
            {/* Control Panel */}
            <Card className="p-8 border-4 border-[#fff200] bg-black shadow-[10px_10px_0px_0px_rgba(255,242,0,0.3)] rounded-none">
              <h3 className="text-2xl font-black mb-6 uppercase italic text-[#fff200]">Bot Status</h3>
              <Button 
                onClick={handleActivateBot} 
                disabled={!isConfigured || isLoading} 
                className={`w-full h-24 text-2xl font-black border-4 border-black rounded-none transition-all uppercase italic ${isActive ? 'bg-red-600 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'bg-[#fff200] text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'} hover:shadow-none hover:translate-x-1 hover:translate-y-1`}
              >
                {isLoading ? <Loader2 className="w-10 h-10 animate-spin" /> : isActive ? 'Deactivate Bot' : 'Activate Bot'}
              </Button>
              
              {isActive && (
                <div className="mt-8 space-y-6">
                  <div className="p-6 bg-[#fff200]/10 border-4 border-[#fff200] rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-[#fff200]" />
                      <span className="text-xs font-black text-[#fff200] uppercase tracking-widest">Next Post</span>
                    </div>
                    <p className="text-3xl font-black text-white italic">{nextPost || "Scheduling..."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#111] border-4 border-white/10 text-center">
                      <p className="text-[10px] text-white/40 font-black uppercase mb-1 tracking-widest">Posts</p>
                      <p className="text-3xl font-black text-[#fff200]">{totalPosts}</p>
                    </div>
                    <div className="p-4 bg-[#111] border-4 border-white/10 text-center">
                      <p className="text-[10px] text-white/40 font-black uppercase mb-1 tracking-widest">Collection</p>
                      <p className="text-3xl font-black text-white">{artworks.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Social Section - FOLLOW ME */}
            <Card className="p-8 border-4 border-[#fff200] bg-[#111] shadow-[10px_10px_0px_0px_rgba(255,242,0,0.2)] rounded-none overflow-hidden">
              <div className="relative aspect-square border-4 border-[#fff200] mb-6 overflow-hidden">
                <img src={SOCIAL_ART_URL} alt="Follow Me" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter">Follow My Journey</h3>
                <p className="text-white/60 text-sm font-bold leading-relaxed">
                  Join me on Bluesky and Objkt to explore more of my digital creations and stay updated!
                </p>
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <a 
                    href="https://bsky.app/profile/biglis-nft.bsky.social" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-[#fff200] text-black p-4 border-2 border-black font-black uppercase text-xs hover:bg-white transition-all"
                  >
                    <span>Follow on Bluesky</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a 
                    href="https://objkt.com/users/tz1RYMi13Yp4tmZ9ibt2yX9G7XC7qkEz31tg" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-white text-black p-4 border-2 border-black font-black uppercase text-xs hover:bg-[#fff200] transition-all"
                  >
                    <span>View on Objkt</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </Card>

            {/* Gallery Preview */}
            {artworks.length > 0 && (
              <Card className="p-6 border-4 border-white bg-black shadow-[10px_10px_0px_0px_rgba(255,255,255,0.1)] rounded-none">
                <div className="flex items-center gap-3 mb-6">
                  <ImageIcon className="w-6 h-6 text-[#fff200]" />
                  <h3 className="text-xl font-black uppercase italic tracking-tighter">Preview</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {artworks.slice(0, 20).map((artwork) => (
                    <div key={artwork.id} className="relative aspect-square border-4 border-white/5 group overflow-hidden">
                      <img src={artwork.thumbnailUrl || artwork.imageUrl} alt={artwork.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" loading="lazy" />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-3 transition-all">
                        <Button size="sm" onClick={() => handleTestPost(artwork.id)} className="h-9 bg-[#fff200] text-black border-2 border-black rounded-none font-black text-[10px] w-full uppercase">
                          POST NOW
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t-4 border-[#fff200] bg-black mt-20 py-12">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[#fff200] font-black italic uppercase tracking-tighter text-3xl">objkt <span className="text-white">→</span> Bluesky</p>
          <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
            Full Collection Automator // 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
