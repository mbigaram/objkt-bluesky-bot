/**
 * Neo-Brutalism Digital Design
 * - Geometria ousada com bordas grossas e sombras duras
 * - Contraste extremo: preto #0A0A0A + verde neon #00FF87 + roxo #8B5CF6
 * - Tipografia: Space Grotesk (display) + Inter (body) + JetBrains Mono (mono)
 * - Layout assimétrico com grid modular
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Clock, Image as ImageIcon, Calendar, Settings, Activity, Loader2, ExternalLink } from "lucide-react";
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

export default function Home() {
  // Configuration state
  const [tezosAddress, setTezosAddress] = useState("");
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPassword, setBlueskyPassword] = useState("");
  const [customMessage, setCustomMessage] = useState("Good morning! ☀️");
  const [profileUrl, setProfileUrl] = useState("");
  const [schedules, setSchedules] = useState<ScheduleTime[]>(DEFAULT_SCHEDULES);

  // Bot state
  const [isConfigured, setIsConfigured] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [artworks, setArtworks] = useState<ObjktArtwork[]>([]);
  const [nextPost, setNextPost] = useState<string>("");
  const [totalPosts, setTotalPosts] = useState(0);
  const [lastPost, setLastPost] = useState<Date | null>(null);

  const botRef = useRef<ObjktBlueskyBot | null>(null);

  // Load saved configuration
  useEffect(() => {
    const savedConfig = localStorage.getItem("botConfig");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.tezosAddress) setTezosAddress(config.tezosAddress);
        if (config.blueskyHandle) setBlueskyHandle(config.blueskyHandle);
        if (config.blueskyPassword) setBlueskyPassword(config.blueskyPassword);
        if (config.customMessage) setCustomMessage(config.customMessage);
        if (config.profileUrl) setProfileUrl(config.profileUrl);
        
        if (config.schedules && Array.isArray(config.schedules)) {
          // Sanitização robusta para evitar NaN e garantir integridade
          const cleanSchedules = config.schedules.map((s: any, index: number) => {
            const id = (s && typeof s.id === 'number' && !isNaN(s.id)) ? s.id : (index + 1);
            return {
              id: id,
              time: s?.time || "12:00",
              enabled: !!s?.enabled,
              message: s?.message || ""
            };
          });
          setSchedules(cleanSchedules.length > 0 ? cleanSchedules : DEFAULT_SCHEDULES);
        }
        setIsConfigured(true);
      } catch (error) {
        console.error("Error loading config:", error);
        setSchedules(DEFAULT_SCHEDULES);
      }
    }
  }, []);

  // Update next post time display
  useEffect(() => {
    if (isActive && botRef.current) {
      const interval = setInterval(() => {
        const status = botRef.current?.getStatus();
        if (status?.nextPost) {
          const now = new Date();
          const next = new Date(status.nextPost);
          const diff = next.getTime() - now.getTime();
          
          if (diff < 24 * 60 * 60 * 1000 && diff > 0) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
            setNextPost(`Em ${hours}h ${minutes}m`);
          } else if (diff > 0) {
            setNextPost(next.toLocaleDateString("pt-BR", { 
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" 
            }));
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
    localStorage.setItem("botConfig", JSON.stringify(config));
    setIsConfigured(true);
    toast.success("Configuração salva com sucesso!");
  };

  const updateScheduleField = (id: number, field: keyof ScheduleTime, value: any) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleActivateBot = async () => {
    if (!isConfigured) {
      toast.error("Configure o bot primeiro");
      return;
    }
    const enabledSchedules = schedules.filter(s => s.enabled);
    if (enabledSchedules.length === 0) {
      toast.error("Ative pelo menos um horário");
      return;
    }
    if (isActive) {
      if (botRef.current) {
        botRef.current.stop();
        botRef.current = null;
      }
      setIsActive(false);
      setArtworks([]);
      setNextPost("");
      toast.success("Bot desativado");
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
      const status = bot.getStatus();
      if (status.nextPost) {
        const next = new Date(status.nextPost);
        setNextPost(next.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      }
      toast.success("Bot ativado! 🚀");
    } catch (error) {
      toast.error(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPost = async (artworkId: string) => {
    if (!botRef.current) {
      toast.error("Bot não está ativo");
      return;
    }
    setIsLoading(true);
    try {
      await botRef.current.postArtwork(artworkId);
      toast.success("Post enviado com sucesso!");
    } catch (error) {
      toast.error(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b-4 border-primary">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-1">objkt → Bluesky Bot</h1>
              <p className="text-muted-foreground">Automatize suas postagens de arte NFT</p>
            </div>
            {isActive && (
              <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary px-4 py-2 rounded-lg">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
                <span className="font-semibold text-primary">ATIVO</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6 border-4 border-border bg-card brutal-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Configuração de APIs</h2>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tezos">Endereço Tezos (objkt.com)</Label>
                  <Input id="tezos" value={tezosAddress} onChange={(e) => setTezosAddress(e.target.value)} placeholder="tz1..." className="font-mono border-2" disabled={isActive} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bluesky-handle">Handle do Bluesky</Label>
                  <Input id="bluesky-handle" value={blueskyHandle} onChange={(e) => setBlueskyHandle(e.target.value)} placeholder="seu-handle.bsky.social" className="border-2" disabled={isActive} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bluesky-password">Senha/App Password do Bluesky</Label>
                  <Input id="bluesky-password" type="password" value={blueskyPassword} onChange={(e) => setBlueskyPassword(e.target.value)} placeholder="••••••••••••" className="border-2" disabled={isActive} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-url">URL do Seu Perfil</Label>
                  <Input id="profile-url" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://objkt.com/profile/..." className="border-2" disabled={isActive} />
                </div>
                <Button onClick={handleSaveConfig} disabled={isActive} className="w-full h-12 text-base font-bold border-4 border-primary bg-primary text-primary-foreground brutal-shadow-hover transition-all">
                  Salvar Configuração
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-4 border-border bg-card brutal-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Horários de Postagem</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map((s) => (
                  <div key={`card-${s.id}`} className={`p-4 border-2 rounded-lg transition-all ${s.enabled ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-semibold">Horário {s.id}</span>
                      <Switch 
                        checked={s.enabled} 
                        onCheckedChange={(val) => updateScheduleField(s.id, 'enabled', val)} 
                        disabled={isActive} 
                      />
                    </div>
                    <Input 
                      type="time" 
                      value={s.time} 
                      onChange={(e) => updateScheduleField(s.id, 'time', e.target.value)} 
                      disabled={!s.enabled || isActive} 
                      className="border-2 font-mono mb-2" 
                    />
                    <Input 
                      type="text" 
                      placeholder="Mensagem (opcional)" 
                      value={s.message || ''} 
                      onChange={(e) => updateScheduleField(s.id, 'message', e.target.value)} 
                      disabled={!s.enabled || isActive} 
                      className="border-2" 
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="p-6 border-4 border-border bg-card brutal-shadow-secondary">
              <h3 className="text-xl font-bold mb-4">Status do Bot</h3>
              <Button onClick={handleActivateBot} disabled={!isConfigured || isLoading} className={`w-full h-14 text-lg font-bold border-4 transition-all ${isActive ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-primary bg-primary text-primary-foreground'} brutal-shadow-hover`}>
                {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : isActive ? 'Desativar Bot' : 'Ativar Bot'}
              </Button>
              {isActive && (
                <div className="mt-6 space-y-4">
                  {nextPost && (
                    <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Próxima Postagem</span>
                      </div>
                      <p className="text-lg font-bold">{nextPost}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 border-2 border-border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-1">Posts</p>
                      <p className="text-2xl font-bold text-primary">{totalPosts}</p>
                    </div>
                    <div className="p-3 bg-muted/30 border-2 border-border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-1">Artes</p>
                      <p className="text-2xl font-bold text-secondary">{artworks.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {artworks.length > 0 && (
              <Card className="p-6 border-4 border-border bg-card brutal-shadow-secondary">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-secondary" />
                  <h3 className="text-xl font-bold">Suas Artes</h3>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {artworks.slice(0, 10).map((artwork) => (
                    <div key={artwork.id} className="p-3 bg-muted/30 border-2 border-border rounded-lg hover:border-primary transition-all group">
                      <img src={artwork.thumbnailUrl || artwork.imageUrl} alt={artwork.name} className="w-full h-24 object-cover rounded mb-2" loading="lazy" />
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-xs truncate flex-1">{artwork.name}</p>
                        <Button size="sm" variant="outline" onClick={() => handleTestPost(artwork.id)} disabled={isLoading} className="ml-2 h-7 w-7 p-0">
                          <ExternalLink className="w-3 h-3" />
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

      <footer className="border-t-4 border-primary mt-20">
        <div className="container py-8 text-center text-muted-foreground text-sm">
          Bot desenvolvido para automatizar postagens de arte NFT do objkt.com no Bluesky
        </div>
      </footer>
    </div>
  );
}
