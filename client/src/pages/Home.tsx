/**
 * Neo-Brutalism Digital Design - REBRANDED
 * - Main Color: #fff200 (Yellow)
 * - Contrast: #0A0A0A (Dark)
 * - Shadows: Hard, dark, solid
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Clock, Image as ImageIcon, Calendar, Settings, Activity, Loader2, ExternalLink, Trash2, Heart, Copy, Maximize2, X } from "lucide-react";
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
const TEZOS_WALLET_1 = "tz1RYMi13Yp4tmZ9ibt2yX9G7XC7qkEz31tg"; // Endereço pessoal do usuário

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
            setNextPost(`Em ${hours}h ${minutes}m`);
          }
        }
        if (status?.lastPost) setLastPost(new Date(status.lastPost));
        if (status?.totalPosts !== undefined) setTotalPosts(status.totalPosts);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const handleSaveConfig = () => {
    if (!tezosAddress || !blueskyHandle || !blueskyPassword) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const config = { tezosAddress, blueskyHandle, blueskyPassword, customMessage, profileUrl, schedules };
    sessionStorage.setItem("botConfig", JSON.stringify(config));
    setIsConfigured(true);
    toast.success("Configuração salva!");
  };

  const handleClearData = () => {
    if (isActive) {
      toast.error("Desative o bot primeiro");
      return;
    }
    if (confirm("Apagar todos os dados da sessão?")) {
      sessionStorage.removeItem("botConfig");
      window.location.reload();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const updateScheduleField = (id: number, field: keyof ScheduleTime, value: any) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleActivateBot = async () => {
    if (isActive) {
      botRef.current?.stop();
      botRef.current = null;
      setIsActive(false);
      setArtworks([]);
      return;
    }
    setIsLoading(true);
    try {
      const config: BotConfig = { tezosAddress, blueskyHandle, blueskyPassword, customMessage, profileUrl, schedules };
      const bot = new ObjktBlueskyBot(config);
      await bot.start();
      botRef.current = bot;
      setIsActive(true);
      setArtworks(bot.getArtworks());
      toast.success("Bot iniciado!");
    } catch (error) {
      toast.error(`Erro: ${error instanceof Error ? error.message : "Falha ao iniciar"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPost = async (artworkId: string) => {
    if (!botRef.current) return;
    setIsLoading(true);
    try {
      await botRef.current.postArtwork(artworkId);
      toast.success("Post de teste enviado!");
    } catch (error) {
      toast.error("Erro no post de teste");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#fff200] selection:text-black">
      {/* Lightbox / Zoom Modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
          <Button className="absolute top-6 right-6 bg-[#fff200] text-black border-2 border-black hover:bg-white" onClick={() => setIsZoomed(false)}>
            <X className="w-6 h-6" />
          </Button>
          <img src={DONATION_ART_URL} alt="Zoomed Donation Art" className="max-w-full max-h-full border-4 border-[#fff200] shadow-[20px_20px_0px_0px_rgba(255,242,0,0.3)]" />
        </div>
      )}

      <header className="border-b-4 border-[#fff200] bg-[#0A0A0A] sticky top-0 z-50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-[#fff200] italic uppercase tracking-tighter">objkt <span className="text-white">→</span> Bluesky</h1>
              <p className="text-[#fff200]/70 font-mono text-xs mt-1">v2.0 // NEO-BRUTALIST AUTOMATION</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleClearData} className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold uppercase text-xs">
                <Trash2 className="w-4 h-4 mr-2" /> Limpar Dados
              </Button>
              {isActive && (
                <div className="flex items-center gap-2 bg-[#fff200] border-2 border-black px-4 py-2 rounded-none shadow-[4px_4px_0px_0px_rgba(255,242,0,0.4)]">
                  <Activity className="w-5 h-5 text-black animate-pulse" />
                  <span className="font-black text-black text-sm">LIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Donation Section - Purple Style Preserved */}
            <Card className="p-8 border-4 border-purple-500 bg-purple-500/5 shadow-[10px_10px_0px_0px_rgba(139,92,246,1)] rounded-none relative overflow-hidden group">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0 w-full md:w-2/5 relative">
                  <div 
                    className="border-4 border-purple-500 bg-black cursor-zoom-in relative group"
                    onClick={() => setIsZoomed(true)}
                  >
                    <img src={DONATION_ART_URL} alt="Donation QR Codes" className="w-full h-auto object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <Maximize2 className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <p className="text-[10px] text-purple-400 font-mono mt-2 text-center uppercase tracking-widest">Clique para ampliar os QR Codes</p>
                </div>
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <Heart className="w-8 h-8 text-purple-500 fill-purple-500" />
                    <h2 className="text-3xl font-black text-white uppercase italic">Support Art</h2>
                  </div>
                  <p className="text-purple-100/80 leading-relaxed font-medium">
                    Este bot é uma ferramenta gratuita para a comunidade Tezos. Se ele te ajuda a economizar tempo, considere apoiar o desenvolvedor. Escaneie os QR codes ou copie os endereços abaixo:
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => copyToClipboard(TEZOS_WALLET_1, "Endereço")}
                      className="w-full justify-between bg-purple-500 hover:bg-white hover:text-purple-500 text-white font-bold border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <span>COPIAR ENDEREÇO TEZOS</span>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Config Section - Yellow Rebrand */}
            <Card className="p-8 border-4 border-[#fff200] bg-[#111] shadow-[12px_12px_0px_0px_rgba(255,242,0,1)] rounded-none">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-[#fff200] flex items-center justify-center border-4 border-black">
                  <Settings className="w-7 h-7 text-black" />
                </div>
                <h2 className="text-3xl font-black uppercase italic text-white">Configurações</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#fff200] font-black uppercase text-xs tracking-widest">Endereço Tezos</Label>
                  <Input value={tezosAddress} onChange={(e) => setTezosAddress(e.target.value)} placeholder="tz1..." className="bg-black border-2 border-[#fff200] text-white rounded-none h-12 focus:ring-0" disabled={isActive} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#fff200] font-black uppercase text-xs tracking-widest">Handle Bluesky</Label>
                  <Input value={blueskyHandle} onChange={(e) => setBlueskyHandle(e.target.value)} placeholder="user.bsky.social" className="bg-black border-2 border-[#fff200] text-white rounded-none h-12 focus:ring-0" disabled={isActive} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[#fff200] font-black uppercase text-xs tracking-widest">App Password</Label>
                  <Input type="password" value={blueskyPassword} onChange={(e) => setBlueskyPassword(e.target.value)} placeholder="••••-••••-••••-••••" className="bg-black border-2 border-[#fff200] text-white rounded-none h-12 focus:ring-0" disabled={isActive} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[#fff200] font-black uppercase text-xs tracking-widest">URL do Perfil (Link no Post)</Label>
                  <Input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="objkt.com/profile/..." className="bg-black border-2 border-[#fff200] text-white rounded-none h-12 focus:ring-0" disabled={isActive} />
                </div>
              </div>
              <Button onClick={handleSaveConfig} disabled={isActive} className="w-full mt-8 h-14 bg-[#fff200] text-black font-black text-lg border-4 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(255,242,0,0.3)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase italic">
                Salvar Configurações
              </Button>
            </Card>

            {/* Schedules Section */}
            <Card className="p-8 border-4 border-white bg-[#111] shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] rounded-none">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-white flex items-center justify-center border-4 border-black">
                  <Clock className="w-7 h-7 text-black" />
                </div>
                <h2 className="text-3xl font-black uppercase italic text-white">Cronograma</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {schedules.map((s) => (
                  <div key={`s-${s.id}`} className={`p-6 border-4 transition-all ${s.enabled ? 'border-[#fff200] bg-[#fff200]/5 shadow-[6px_6px_0px_0px_rgba(255,242,0,1)]' : 'border-[#333] bg-black opacity-50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-black text-white italic">HORÁRIO {s.id}</span>
                      <Switch checked={s.enabled} onCheckedChange={(val) => updateScheduleField(s.id, 'enabled', val)} disabled={isActive} className="data-[state=checked]:bg-[#fff200]" />
                    </div>
                    <Input type="time" value={s.time} onChange={(e) => updateScheduleField(s.id, 'time', e.target.value)} disabled={!s.enabled || isActive} className="bg-black border-2 border-white/20 text-white font-mono mb-4 rounded-none h-12" />
                    <Input placeholder="Mensagem personalizada..." value={s.message || ''} onChange={(e) => updateScheduleField(s.id, 'message', e.target.value)} disabled={!s.enabled || isActive} className="bg-black border-2 border-white/20 text-white rounded-none" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-10">
            {/* Control Panel */}
            <Card className="p-8 border-4 border-[#fff200] bg-black shadow-[10px_10px_0px_0px_rgba(255,242,0,1)] rounded-none">
              <h3 className="text-2xl font-black mb-6 uppercase italic text-white">Painel de Controle</h3>
              <Button 
                onClick={handleActivateBot} 
                disabled={!isConfigured || isLoading} 
                className={`w-full h-20 text-xl font-black border-4 border-black rounded-none transition-all uppercase italic ${isActive ? 'bg-red-600 text-white shadow-[6px_6px_0px_0px_rgba(220,38,38,0.5)]' : 'bg-[#fff200] text-black shadow-[6px_6px_0px_0px_rgba(255,242,0,0.5)]'} hover:shadow-none hover:translate-x-1 hover:translate-y-1`}
              >
                {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : isActive ? 'Desativar Bot' : 'Ativar Bot'}
              </Button>
              
              {isActive && (
                <div className="mt-8 space-y-6">
                  <div className="p-5 bg-[#fff200]/10 border-4 border-[#fff200] rounded-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-[#fff200]" />
                      <span className="text-xs font-black text-[#fff200] uppercase tracking-widest">Next Drop</span>
                    </div>
                    <p className="text-3xl font-black text-white italic">{nextPost || "Calculando..."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#111] border-2 border-white/20 text-center">
                      <p className="text-[10px] text-white/50 font-black uppercase mb-1">Total Posts</p>
                      <p className="text-3xl font-black text-[#fff200]">{totalPosts}</p>
                    </div>
                    <div className="p-4 bg-[#111] border-2 border-white/20 text-center">
                      <p className="text-[10px] text-white/50 font-black uppercase mb-1">Artworks</p>
                      <p className="text-3xl font-black text-white">{artworks.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Preview Section */}
            {artworks.length > 0 && (
              <Card className="p-6 border-4 border-white bg-black shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] rounded-none">
                <div className="flex items-center gap-3 mb-6">
                  <ImageIcon className="w-6 h-6 text-[#fff200]" />
                  <h3 className="text-xl font-black uppercase italic">Preview Galeria</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {artworks.slice(0, 12).map((artwork) => (
                    <div key={artwork.id} className="relative aspect-square border-2 border-white/10 group overflow-hidden">
                      <img src={artwork.thumbnailUrl || artwork.imageUrl} alt={artwork.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" loading="lazy" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-2 transition-all">
                        <p className="text-[10px] font-black text-center mb-2 line-clamp-2">{artwork.name}</p>
                        <Button size="sm" onClick={() => handleTestPost(artwork.id)} className="h-8 bg-[#fff200] text-black border-2 border-black rounded-none font-black text-[10px] w-full">
                          TEST POST
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

      <footer className="border-t-4 border-[#fff200] bg-black mt-20">
        <div className="container py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[#fff200] font-black italic uppercase tracking-tighter text-xl">objkt → Bluesky</p>
          <p className="text-white/40 font-mono text-xs uppercase tracking-widest">
            Made for Tezos Artists // No data stored permanently
          </p>
        </div>
      </footer>
    </div>
  );
}
