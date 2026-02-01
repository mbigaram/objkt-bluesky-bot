/**
 * Refined Design - Delicacy & Focus
 * - Colors: #fff200 (Yellow), #ff6b00 (Orange)
 * - Style: Rounded corners (rounded-xl), subtle shadows, clean UI
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Clock, Image as ImageIcon, Calendar, Settings, Activity, Loader2, Trash2, Heart, Copy, Maximize2, X } from "lucide-react";
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
const TEZOS_WALLET_1 = "tz1RYMi13Yp4tmZ9ibt2yX9G7XC7qkEz31tg";

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
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#fff200] selection:text-black pb-20">
      {/* Lightbox - FOCUS ON QR CODES ONLY */}
      {isZoomed && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
          <Button className="absolute top-8 right-8 bg-white text-black rounded-full w-12 h-12 flex items-center justify-center shadow-xl" onClick={() => setIsZoomed(false)}>
            <X className="w-6 h-6" />
          </Button>
          
          <div className="w-full max-w-5xl flex flex-col items-center gap-10">
            <h2 className="text-4xl font-black text-[#ff6b00] uppercase tracking-tighter">Escaneie para Apoiar</h2>
            
            {/* Visual hack to show only the QR section by using a container with overflow hidden and a large scale/translate */}
            <div className="relative w-full aspect-[2/1] overflow-hidden rounded-3xl border-8 border-[#ff6b00] bg-white shadow-[0_0_60px_rgba(255,107,0,0.3)]">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* We scale the image and translate it to focus on the bottom area where QRs are */}
                <img 
                  src={DONATION_ART_URL} 
                  alt="QR Codes Focused" 
                  className="w-full h-auto scale-[2.2] translate-y-[25%]" 
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
              <Button 
                onClick={(e) => { e.stopPropagation(); copyToClipboard(TEZOS_WALLET_1, "Carteira"); }} 
                className="flex-1 h-16 bg-[#ff6b00] text-white text-xl font-black rounded-2xl shadow-lg hover:scale-105 transition-transform"
              >
                COPIAR CARTEIRA TEZOS
              </Button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
        <div className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#fff200] rounded-xl flex items-center justify-center rotate-3">
              <Activity className="text-black w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">objkt <span className="text-[#fff200]">→</span> bsky</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleClearData} className="text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl font-bold">
              <Trash2 className="w-4 h-4 mr-2" /> Limpar Dados
            </Button>
            {isActive && (
              <div className="px-4 py-2 bg-[#fff200]/10 border border-[#fff200]/30 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-[#fff200] rounded-full animate-ping" />
                <span className="text-[#fff200] text-xs font-black uppercase tracking-widest">Bot Online</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Donation & Config */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Donation Card - ORANGE & DELICATE */}
            <Card className="overflow-hidden border-none bg-gradient-to-br from-[#ff6b00] to-[#ff8533] rounded-[2.5rem] shadow-2xl shadow-[#ff6b00]/20">
              <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-10">
                <div className="w-full md:w-1/3 relative group cursor-zoom-in" onClick={() => setIsZoomed(true)}>
                  <div className="aspect-square rounded-3xl overflow-hidden border-4 border-white/20 shadow-inner bg-black">
                    <img src={DONATION_ART_URL} alt="Donation Art" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-white text-[#ff6b00] p-3 rounded-2xl shadow-xl">
                    <Maximize2 className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full mb-4">
                    <Heart className="w-4 h-4 text-white fill-white" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">Apoie a Arte</span>
                  </div>
                  <h2 className="text-4xl font-black text-white mb-4 leading-tight">Mantenha o Bot vivo!</h2>
                  <p className="text-white/90 font-medium mb-8 text-lg">
                    Este bot é gratuito e automatiza toda a sua coleção Objkt. Se ele é útil para você, considere fazer uma doação para apoiar as atualizações.
                  </p>
                  <Button 
                    onClick={() => copyToClipboard(TEZOS_WALLET_1, "Carteira")}
                    className="w-full md:w-auto px-10 h-16 bg-white text-[#ff6b00] hover:bg-[#0A0A0A] hover:text-white rounded-2xl font-black text-lg shadow-xl transition-all"
                  >
                    COPIAR CARTEIRA TEZOS
                  </Button>
                </div>
              </div>
            </Card>

            {/* Config Card - DELICATE & YELLOW */}
            <Card className="p-10 border-none bg-[#161616] rounded-[2.5rem] shadow-xl">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-[#fff200] rounded-2xl flex items-center justify-center">
                  <Settings className="text-black w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Configurações</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-white/50 font-bold ml-1">Endereço Tezos</Label>
                  <Input value={tezosAddress} onChange={(e) => setTezosAddress(e.target.value)} placeholder="tz1..." className="bg-white/5 border-none h-14 rounded-2xl px-6 focus:ring-2 focus:ring-[#fff200] text-white font-medium" disabled={isActive} />
                </div>
                <div className="space-y-3">
                  <Label className="text-white/50 font-bold ml-1">Handle Bluesky</Label>
                  <Input value={blueskyHandle} onChange={(e) => setBlueskyHandle(e.target.value)} placeholder="user.bsky.social" className="bg-white/5 border-none h-14 rounded-2xl px-6 focus:ring-2 focus:ring-[#fff200] text-white font-medium" disabled={isActive} />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label className="text-white/50 font-bold ml-1">App Password</Label>
                  <Input type="password" value={blueskyPassword} onChange={(e) => setBlueskyPassword(e.target.value)} placeholder="••••-••••-••••-••••" className="bg-white/5 border-none h-14 rounded-2xl px-6 focus:ring-2 focus:ring-[#fff200] text-white font-medium" disabled={isActive} />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label className="text-white/50 font-bold ml-1">URL do Perfil (Link no Post)</Label>
                  <Input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://objkt.com/profile/..." className="bg-white/5 border-none h-14 rounded-2xl px-6 focus:ring-2 focus:ring-[#fff200] text-white font-medium" disabled={isActive} />
                </div>
              </div>
              
              <Button onClick={handleSaveConfig} disabled={isActive} className="w-full mt-10 h-16 bg-[#fff200] text-black hover:bg-white rounded-2xl font-black text-xl shadow-lg shadow-[#fff200]/10 transition-all">
                SALVAR CONFIGURAÇÕES
              </Button>
            </Card>

            {/* Schedules - GRID DELICADO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schedules.map((s) => (
                <Card key={`s-${s.id}`} className={`p-8 border-none rounded-[2rem] transition-all duration-500 ${s.enabled ? 'bg-[#fff200] text-black shadow-2xl shadow-[#fff200]/10' : 'bg-[#161616] text-white/20'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.enabled ? 'bg-black/10' : 'bg-white/5'}`}>
                        <Clock className={`w-5 h-5 ${s.enabled ? 'text-black' : 'text-white/20'}`} />
                      </div>
                      <span className="font-black uppercase tracking-tighter text-lg">Horário {s.id}</span>
                    </div>
                    <Switch checked={s.enabled} onCheckedChange={(val) => updateScheduleField(s.id, 'enabled', val)} disabled={isActive} className="data-[state=checked]:bg-black" />
                  </div>
                  <Input type="time" value={s.time} onChange={(e) => updateScheduleField(s.id, 'time', e.target.value)} disabled={!s.enabled || isActive} className={`border-none h-12 rounded-xl font-black text-xl mb-4 ${s.enabled ? 'bg-black/5 text-black' : 'bg-white/5 text-white/20'}`} />
                  <Input placeholder="Mensagem personalizada..." value={s.message || ''} onChange={(e) => updateScheduleField(s.id, 'message', e.target.value)} disabled={!s.enabled || isActive} className={`border-none rounded-xl ${s.enabled ? 'bg-black/5 text-black placeholder:text-black/40' : 'bg-white/5 text-white/20'}`} />
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column: Control & Preview */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Control Panel */}
            <Card className="p-8 border-none bg-[#fff200] rounded-[2.5rem] shadow-2xl shadow-[#fff200]/10 overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-black mb-6 uppercase tracking-tighter italic">Status do Sistema</h3>
                <Button 
                  onClick={handleActivateBot} 
                  disabled={!isConfigured || isLoading} 
                  className={`w-full h-24 rounded-3xl text-2xl font-black shadow-xl transition-all ${isActive ? 'bg-black text-white hover:bg-red-600' : 'bg-white text-black hover:scale-105'}`}
                >
                  {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : isActive ? 'DESLIGAR' : 'LIGAR BOT'}
                </Button>
                
                {isActive && (
                  <div className="mt-8 space-y-4">
                    <div className="p-6 bg-black/5 rounded-2xl border border-black/10">
                      <p className="text-[10px] font-black uppercase text-black/40 mb-1">Próxima Postagem</p>
                      <p className="text-3xl font-black text-black tracking-tighter">{nextPost || "Calculando..."}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-black/5 rounded-2xl text-center border border-black/10">
                        <p className="text-[10px] font-black uppercase text-black/40 mb-1">Posts</p>
                        <p className="text-2xl font-black text-black">{totalPosts}</p>
                      </div>
                      <div className="p-4 bg-black/5 rounded-2xl text-center border border-black/10">
                        <p className="text-[10px] font-black uppercase text-black/40 mb-1">Obras</p>
                        <p className="text-2xl font-black text-black">{artworks.length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-black/5 rounded-full blur-3xl" />
            </Card>

            {/* Preview Gallery */}
            {artworks.length > 0 && (
              <Card className="p-8 border-none bg-[#161616] rounded-[2.5rem] shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <ImageIcon className="w-6 h-6 text-[#fff200]" />
                  <h3 className="text-xl font-black uppercase tracking-tighter">Acervo</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {artworks.slice(0, 20).map((artwork) => (
                    <div key={artwork.id} className="relative aspect-square rounded-2xl overflow-hidden group">
                      <img src={artwork.thumbnailUrl || artwork.imageUrl} alt={artwork.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-4 transition-all duration-300">
                        <Button size="sm" onClick={() => handleTestPost(artwork.id)} className="w-full bg-[#fff200] text-black rounded-xl font-black text-[10px] uppercase">
                          POSTAR
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

      <footer className="container mt-20 py-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#fff200] rounded-md" />
          <p className="font-black text-white/40 uppercase tracking-tighter">objkt → bsky</p>
        </div>
        <p className="text-white/20 font-mono text-[10px] uppercase tracking-[0.2em]">
          Tezos Community Project // 2026
        </p>
      </footer>
    </div>
  );
}
