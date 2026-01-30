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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Clock, Zap, Image as ImageIcon, Calendar, Settings, Activity, Loader2, ExternalLink } from "lucide-react";
import { ObjktBlueskyBot, BotConfig } from "@/lib/bot";
import { ObjktArtwork } from "@/lib/objkt";

interface ScheduleTime {
  id: number;
  time: string;
  enabled: boolean;
  message?: string;
}

export default function Home() {
  // Configuration state
  const [tezosAddress, setTezosAddress] = useState("");
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPassword, setBlueskyPassword] = useState("");
  const [customMessage, setCustomMessage] = useState("Good morning! ☀️");
  const [profileUrl, setProfileUrl] = useState("");
  const [schedules, setSchedules] = useState<ScheduleTime[]>([
    { id: 1, time: "09:00", enabled: true },
    { id: 2, time: "13:00", enabled: true },
    { id: 3, time: "17:00", enabled: true },
    { id: 4, time: "21:00", enabled: true },
  ]);

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
        setTezosAddress(config.tezosAddress || "");
        setBlueskyHandle(config.blueskyHandle || "");
        setBlueskyPassword(config.blueskyPassword || "");
        setCustomMessage(config.customMessage || "Good morning! ☀️");
        setProfileUrl(config.profileUrl || "");
        setSchedules(config.schedules || schedules);
        setIsConfigured(true);
      } catch (error) {
        console.error("Error loading config:", error);
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
          
          if (diff < 24 * 60 * 60 * 1000) {
            // Less than 24 hours
            const hours = Math.floor(diff / (60 * 60 * 1000));
            const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
            setNextPost(`Em ${hours}h ${minutes}m`);
          } else {
            setNextPost(next.toLocaleDateString("pt-BR", { 
              day: "2-digit", 
              month: "2-digit", 
              hour: "2-digit", 
              minute: "2-digit" 
            }));
          }
        }
        
        if (status?.lastPost) {
          setLastPost(new Date(status.lastPost));
        }
        
        if (status?.totalPosts !== undefined) {
          setTotalPosts(status.totalPosts);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isActive]);

  const handleSaveConfig = () => {
    if (!tezosAddress || !blueskyHandle || !blueskyPassword) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const config = {
      tezosAddress,
      blueskyHandle,
      blueskyPassword,
      customMessage,
      profileUrl,
      schedules,
    };

    localStorage.setItem("botConfig", JSON.stringify(config));
    setIsConfigured(true);
    toast.success("Configuração salva com sucesso!");
  };

  const handleToggleSchedule = (id: number) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleUpdateTime = (id: number, time: string) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, time } : s
    ));
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

    // Deactivate bot
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

    // Activate bot
    setIsLoading(true);
    try {
      const config: BotConfig = {
        tezosAddress,
        blueskyHandle,
        blueskyPassword,
        customMessage,
        profileUrl,
        schedules,
      };

      const bot = new ObjktBlueskyBot(config);
      await bot.start();

      botRef.current = bot;
      setIsActive(true);
      
      // Get artworks
      const fetchedArtworks = bot.getArtworks();
      setArtworks(fetchedArtworks);

      // Get status
      const status = bot.getStatus();
      if (status.nextPost) {
        const next = new Date(status.nextPost);
        setNextPost(next.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      }

      toast.success("Bot ativado! 🚀");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao ativar bot: ${errorMessage}`);
      console.error("Bot activation error:", error);
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
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao postar: ${errorMessage}`);
      console.error("Post error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-primary">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-1">objkt → Bluesky Bot</h1>
              <p className="text-muted-foreground">Automatize suas postagens de arte NFT</p>
            </div>
            <div className="flex items-center gap-4">
              {isActive && (
                <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary px-4 py-2 rounded-lg">
                  <Activity className="w-5 h-5 text-primary animate-pulse" />
                  <span className="font-semibold text-primary">ATIVO</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-8">
            {/* Custom Message */}
            <Card className="p-6 border-4 border-border bg-card brutal-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Mensagem Personalizada</h2>
                  <p className="text-sm text-muted-foreground">Adicione uma mensagem às suas postagens</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="message" className="text-base font-semibold mb-2 block">
                    Sua Mensagem
                  </Label>
                  <Textarea
                    id="message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Ex: Good morning! ☀️"
                    className="min-h-[100px] border-2 text-base"
                    disabled={isActive}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Formato final: "{customMessage} - [Nome da Arte] - [Preço] XTZ"
                  </p>
                </div>
              </div>
            </Card>

            {/* API Configuration */}
            <Card className="p-6 border-4 border-border bg-card brutal-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Configuração de APIs</h2>
                  <p className="text-sm text-muted-foreground">Conecte suas contas</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="tezos" className="text-base font-semibold mb-2 block">
                    Endereço Tezos (objkt.com)
                  </Label>
                  <Input
                    id="tezos"
                    value={tezosAddress}
                    onChange={(e) => setTezosAddress(e.target.value)}
                    placeholder="tz1..."
                    className="font-mono border-2 text-base"
                    disabled={isActive}
                  />
                </div>

                <div>
                  <Label htmlFor="bluesky-handle" className="text-base font-semibold mb-2 block">
                    Handle do Bluesky
                  </Label>
                  <Input
                    id="bluesky-handle"
                    value={blueskyHandle}
                    onChange={(e) => setBlueskyHandle(e.target.value)}
                    placeholder="seu-handle.bsky.social"
                    className="border-2 text-base"
                    disabled={isActive}
                  />
                </div>

                <div>
                  <Label htmlFor="bluesky-password" className="text-base font-semibold mb-2 block">
                    Senha/App Password do Bluesky
                  </Label>
                  <Input
                    id="bluesky-password"
                    type="password"
                    value={blueskyPassword}
                    onChange={(e) => setBlueskyPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="border-2 text-base"
                    disabled={isActive}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Recomendado: Use um App Password gerado nas configurações do Bluesky
                  </p>
                </div>

                <div>
                  <Label htmlFor="profile-url" className="text-base font-semibold mb-2 block">
                    URL do Seu Perfil (Link para compartilhar)
                  </Label>
                  <Input
                    id="profile-url"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="https://objkt.com/profile/seu-endereco"
                    className="border-2 text-base"
                    disabled={isActive}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Link do seu perfil no objkt.com ou Bluesky para incluir nos posts
                  </p>
                </div>

                <Button 
                  onClick={handleSaveConfig}
                  disabled={isActive}
                  className="w-full h-12 text-base font-bold border-4 border-primary bg-primary text-primary-foreground hover:bg-primary/90 brutal-shadow-hover transition-all"
                >
                  Salvar Configuração
                </Button>
              </div>
            </Card>

            {/* Schedule Configuration */}
            <Card className="p-6 border-4 border-border bg-card brutal-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Horários de Postagem</h2>
                  <p className="text-sm text-muted-foreground">Configure até 4 horários</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map((schedule) => (
                  <div 
                    key={schedule.id}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      schedule.enabled 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">
                        Horário {schedule.id}
                      </Label>
                      <button
                        onClick={() => handleToggleSchedule(schedule.id)}
                        disabled={isActive}
                        className={`w-12 h-6 rounded-full transition-all ${
                          schedule.enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          schedule.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    <Input
                      type="time"
                      value={schedule.time}
                      onChange={(e) => handleUpdateTime(schedule.id, e.target.value)}
                      disabled={!schedule.enabled || isActive}
                      className="border-2 text-base font-mono mb-2"
                    />
                    <Input
                      type="text"
                      placeholder="Mensagem personalizada (opcional)"
                      value={schedule.message || ''}
                      onChange={(e) => setSchedules(schedules.map(s => 
                        s.id === schedule.id ? { ...s, message: e.target.value } : s
                      ))}
                      disabled={!schedule.enabled || isActive}
                      className="border-2 text-base"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Status Panel */}
          <div className="space-y-8">
            {/* Activation */}
            <Card className="p-6 border-4 border-border bg-card brutal-shadow-secondary">
              <h3 className="text-xl font-bold mb-4">Status do Bot</h3>
              
              <Button
                onClick={handleActivateBot}
                disabled={!isConfigured || isLoading}
                className={`w-full h-14 text-lg font-bold border-4 transition-all ${
                  isActive
                    ? 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                } brutal-shadow-hover`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : isActive ? (
                  'Desativar Bot'
                ) : (
                  'Ativar Bot'
                )}
              </Button>

              {!isConfigured && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Configure o bot primeiro
                </p>
              )}

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
                    <div className="p-3 bg-muted/30 border-2 border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total de Posts</p>
                      <p className="text-2xl font-bold text-primary">{totalPosts}</p>
                    </div>
                    <div className="p-3 bg-muted/30 border-2 border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Artes</p>
                      <p className="text-2xl font-bold text-secondary">{artworks.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Artworks Preview */}
            {artworks.length > 0 && (
              <Card className="p-6 border-4 border-border bg-card brutal-shadow-secondary">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-secondary" />
                  <h3 className="text-xl font-bold">Suas Artes</h3>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {artworks.slice(0, 10).map((artwork, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-muted/30 border-2 border-border rounded-lg hover:border-primary transition-all group"
                    >
                      <img 
                        src={artwork.thumbnailUrl || artwork.imageUrl} 
                        alt={artwork.name}
                        className="w-full h-32 object-cover rounded mb-2"
                        loading="lazy"
                      />
                      <p className="font-semibold text-sm mb-1 truncate">{artwork.name}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-primary font-bold font-mono text-sm">{artwork.price} XTZ</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestPost(artwork.id)}
                          disabled={isLoading}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Info */}
            <Card className="p-6 border-4 border-border bg-card brutal-shadow-secondary">
              <h3 className="text-lg font-bold mb-3">Como Funciona</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Configure suas credenciais do objkt.com e Bluesky
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Escolha até 4 horários para postagens automáticas
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Personalize a mensagem que acompanha suas artes
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  Ative o bot e relaxe! Ele cuida do resto
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-primary mt-20">
        <div className="container py-8">
          <p className="text-center text-muted-foreground">
            Bot desenvolvido para automatizar postagens de arte NFT do objkt.com no Bluesky
          </p>
        </div>
      </footer>
    </div>
  );
}
