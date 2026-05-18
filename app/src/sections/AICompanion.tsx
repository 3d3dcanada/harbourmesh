import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Send, Sparkles, Wrench, Navigation, FileText,
  Settings, ChevronRight, Lightbulb, Loader2, User, Ship,
  CheckCircle2, AlertTriangle, Zap, Trash2,
  RefreshCw, Monitor, Mic, MicOff,
} from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAIStore, useAppStore, useVesselStore, useTelemetryStore, useLogTaskStore } from '@/store';
import { resolveHeading } from '@/lib/heading';
import { AIProviderType, type AIProviderConfig } from '@/types';
import { detectLocalServers, serverToProvider, createNvidiaProvider, NVIDIA_NIM_MODELS, HARBORMESH_SYSTEM_PROMPT, type LocalAIServer } from '@/lib/local-ai';
import { buildToolDefinitions, parseToolCall, executeToolCall } from '@/lib/ai-tools';
import { useVoiceInput } from '@/hooks/useVoiceInput';

const quickActions = [
  { id: 'onboard', title: 'Help me onboard my vessel', description: 'Guide through initial setup and configuration', icon: Ship },
  { id: 'systems', title: 'Explain my vessel systems', description: 'Learn about engines, electrical, plumbing, etc.', icon: Wrench },
  { id: 'maintenance', title: 'Create maintenance schedule', description: 'Generate tasks based on manufacturer recommendations', icon: CheckCircle2 },
  { id: 'navigation', title: 'Plan a voyage', description: 'Get routing advice and weather considerations', icon: Navigation },
  { id: 'documents', title: 'Summarize my documents', description: 'Extract key info from manuals and certificates', icon: FileText },
  { id: 'troubleshoot', title: 'Troubleshoot an issue', description: 'Get help diagnosing and fixing problems', icon: AlertTriangle },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

async function requestProviderChat(provider: AIProviderConfig, messages: Message[], systemPrompt?: string): Promise<string> {
  const baseUrl = provider.apiUrl.replace(/\/+$/, '');
  const chatMessages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    chatMessages.push({ role: 'system', content: systemPrompt });
  }
  chatMessages.push(...messages.slice(-12).map((message) => ({
    role: message.role,
    content: message.content,
  })));

  if (provider.providerType === AIProviderType.LOCAL) {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.chatModel || 'llama3.1',
        messages: chatMessages,
        stream: false,
      }),
    });

    const body = await response.json().catch(() => null) as { message?: { content?: string }; response?: string; error?: string } | null;
    if (!response.ok) throw new Error(body?.error || response.statusText);
    const content = body?.message?.content || body?.response;
    if (!content) throw new Error('Provider returned no assistant message');
    return content;
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: provider.chatModel || 'gpt-4o-mini',
      messages: chatMessages,
      temperature: provider.temperature ?? 0.2,
      max_tokens: provider.maxTokens,
    }),
  });

  const body = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } | string } | null;
  if (!response.ok) {
    const error = typeof body?.error === 'string' ? body.error : body?.error?.message;
    throw new Error(error || response.statusText);
  }
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Provider returned no assistant message');
  return content;
}

function buildVesselContext(): string {
  const vessel = useVesselStore.getState().currentVessel;
  const { latestPosition, latestMotion, latestEnvironment } = useTelemetryStore.getState();
  const { tasks } = useLogTaskStore.getState();
  const { items } = useVesselStore.getState();
  const openTasks = tasks.filter((t) => t.status !== 'complete').length;
  const heading = resolveHeading(latestMotion?.yaw, latestPosition?.cog, latestPosition?.sog);

  const lines = [HARBORMESH_SYSTEM_PROMPT, '', '--- Current Vessel Data ---'];

  if (vessel) {
    lines.push(`Vessel: ${vessel.name} (${vessel.type.replace(/_/g, ' ')})`);
    if (vessel.lengthOverall) lines.push(`LOA: ${vessel.lengthOverall}m, Beam: ${vessel.beam}m, Draft: ${vessel.draft}m`);
    if (vessel.engines.length > 0) {
      lines.push(`Engines: ${vessel.engines.map((e) => `${e.name} (${e.make} ${e.model}, ${e.hours.toFixed(0)}hrs)`).join('; ')}`);
    }
    if (vessel.tanks.length > 0) {
      lines.push(`Tanks: ${vessel.tanks.map((t) => `${t.name}: ${t.currentLevel ?? '?'}/${t.capacity}L ${t.type}`).join('; ')}`);
    }
  } else {
    lines.push('No vessel configured yet.');
  }
  if (latestPosition) {
    lines.push(`Position: ${latestPosition.latitude.toFixed(5)}, ${latestPosition.longitude.toFixed(5)}`);
    if (latestPosition.sog != null) lines.push(`Speed: ${latestPosition.sog.toFixed(1)} kn`);
  }
  if (heading.source !== 'none') {
    lines.push(`Heading: ${Math.round(heading.heading)}° (${heading.source})`);
  }
  if (latestEnvironment) {
    const envParts: string[] = [];
    if (latestEnvironment.depth != null) envParts.push(`Depth: ${latestEnvironment.depth.toFixed(1)}m`);
    if (latestEnvironment.windSpeed != null) envParts.push(`Wind: ${latestEnvironment.windSpeed.toFixed(0)} kn`);
    if (latestEnvironment.waterTemp != null) envParts.push(`Water temp: ${latestEnvironment.waterTemp.toFixed(1)}C`);
    if (envParts.length) lines.push(envParts.join(', '));
  }
  lines.push(`Open tasks: ${openTasks}, Inventory items: ${items.length}`);

  lines.push('', '--- Available Tools ---');
  lines.push('You can perform actions by including a tool call in your response using this format:');
  lines.push('[TOOL_CALL: tool_name("key": "value", "key2": "value2")]');
  lines.push('');
  lines.push(buildToolDefinitions());
  lines.push('');
  lines.push('When a user asks you to DO something (add items, create tasks, log entries, etc.), use the appropriate tool. Show the result to the user after the tool executes.');

  return lines.join('\n');
}

// --- Quick Setup Component ---
function QuickSetup({ onComplete }: { onComplete: () => void }) {
  const { addProvider, setActiveProvider } = useAIStore();
  const [scanning, setScanning] = useState(false);
  const [servers, setServers] = useState<LocalAIServer[]>([]);
  const [scanned, setScanned] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualScanning, setManualScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [showNvidia, setShowNvidia] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const found = await detectLocalServers();
      setServers(found);
      setScanned(true);
      if (found.length === 0) {
        setError('No local AI servers detected. Make sure Ollama or LM Studio is running.');
      }
    } catch {
      setError('Scan failed. Check if your AI server is running.');
    } finally {
      setScanning(false);
    }
  };

  const handleManualProbe = async () => {
    if (!manualUrl.trim()) return;
    setManualScanning(true);
    setError(null);
    try {
      const url = manualUrl.trim().replace(/\/+$/, '');
      const found = await detectLocalServers();
      const custom = found.find((s) => s.url === url);
      if (custom) {
        setServers((prev) => [...prev.filter((s) => s.url !== url), custom]);
      } else {
        setError(`Could not connect to ${url}. Check the URL and make sure the server is running.`);
      }
    } catch {
      setError('Connection failed.');
    } finally {
      setManualScanning(false);
    }
  };

  const handleSelectModel = (server: LocalAIServer, modelId: string) => {
    const provider = serverToProvider(server, modelId);
    addProvider(provider as never);
    setActiveProvider(provider as never);
    onComplete();
  };

  const handleSelectNvidiaModel = (modelId: string) => {
    if (!nvidiaKey.trim()) return;
    const provider = createNvidiaProvider(modelId, nvidiaKey.trim());
    addProvider(provider as never);
    setActiveProvider(provider as never);
    onComplete();
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Monitor className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle>Connect Local AI</CardTitle>
            <CardDescription>Use your own AI models running on this PC</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          HarborMesh connects to AI models running locally on your computer. Supports Ollama, LM Studio, and any OpenAI-compatible server. All data stays on your machine.
        </p>

        {!scanned ? (
          <Button onClick={handleScan} disabled={scanning} className="w-full">
            {scanning ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Detect Local AI Servers</>
            )}
          </Button>
        ) : servers.length > 0 ? (
          <div className="space-y-3">
            {servers.map((server) => (
              <div key={server.url} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-sm">{server.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{server.url}</span>
                </div>
                <p className="text-xs text-muted-foreground">{server.models.length} model{server.models.length !== 1 ? 's' : ''} available</p>
                <div className="grid gap-1.5">
                  {server.models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleSelectModel(server, model.id)}
                      className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">{model.name}</p>
                        <p className="text-xs text-muted-foreground">{model.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {model.parameterSize && (
                          <Badge variant="secondary" className="text-[10px]">{model.parameterSize}</Badge>
                        )}
                        {model.size && (
                          <Badge variant="outline" className="text-[10px]">{model.size}</Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning} className="w-full">
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", scanning && "animate-spin")} /> Rescan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">No servers found</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Start Ollama or LM Studio on your PC, then scan again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning} className="w-full">
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", scanning && "animate-spin")} /> Scan Again
            </Button>
          </div>
        )}

        <div className="border-t pt-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Custom server URL</p>
          <div className="flex gap-2">
            <Input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={handleManualProbe} disabled={manualScanning || !manualUrl.trim()}>
              {manualScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
            </Button>
          </div>
        </div>

        {/* NVIDIA Cloud Option */}
        <div className="border-t pt-3 space-y-2">
          <button
            onClick={() => setShowNvidia(!showNvidia)}
            className="flex items-center justify-between w-full text-left"
          >
            <p className="text-xs font-medium text-muted-foreground">NVIDIA Cloud AI (Kimi K2, DeepSeek, Llama)</p>
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", showNvidia && "rotate-90")} />
          </button>
          {showNvidia && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Input
                  type="password"
                  value={nvidiaKey}
                  onChange={(e) => setNvidiaKey(e.target.value)}
                  placeholder="nvapi-..."
                  className="h-8 text-sm font-mono"
                />
              </div>
              {nvidiaKey.trim() && (
                <div className="grid gap-1.5">
                  {NVIDIA_NIM_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleSelectNvidiaModel(model.id)}
                      className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">{model.name}</p>
                        <p className="text-xs text-muted-foreground">{model.id}</p>
                      </div>
                      {model.parameterSize && (
                        <Badge variant="secondary" className="text-[10px]">{model.parameterSize}</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function AICompanion() {
  const { activeProvider, addMessage, clearConversation, isProcessing, setProcessing } = useAIStore();
  const setActiveView = useAppStore((s) => s.setActiveView);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [agentMode, setAgentMode] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setInput(text);
  }, []);
  const voice = useVoiceInput(handleVoiceResult);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewport = el.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const target = viewport || el;
    target.scrollTop = target.scrollHeight;
  }, [messages, streamingMessage]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !activeProvider) return;
    const userMessage: Message = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setProcessing(true);
    setStreamingMessage('');

    try {
      const response = await requestProviderChat(activeProvider, nextMessages, buildVesselContext());

      if (agentMode) {
        const toolCall = parseToolCall(response);
        if (toolCall) {
          const toolResult = executeToolCall(toolCall.toolName, toolCall.args);
          const cleanResponse = response.replace(/\[TOOL_CALL:.*?\]/s, '').trim();
          const toolMessage = cleanResponse
            ? `${cleanResponse}\n\n**Action:** ${toolCall.toolName}\n${toolResult}`
            : `**Action:** ${toolCall.toolName}\n${toolResult}`;
          const assistantMessage: Message = { role: 'assistant', content: toolMessage, timestamp: new Date().toISOString() };
          setMessages((prev) => [...prev, assistantMessage]);
          addMessage('user', userMessage.content);
          addMessage('assistant', toolMessage);
          return;
        }
      }

      const assistantMessage: Message = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMessage]);
      addMessage('user', userMessage.content);
      addMessage('assistant', response);
    } catch (error) {
      const content = error instanceof Error ? error.message : 'AI provider request failed.';
      setMessages((prev) => [...prev, { role: 'assistant', content, timestamp: new Date().toISOString() }]);
    } finally {
      setStreamingMessage('');
      setProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuickAction = (actionId: string) => {
    if (!activeProvider) return;
    const action = quickActions.find((a) => a.id === actionId);
    if (action) { setInput(action.title); inputRef.current?.focus(); }
  };

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Show setup if no provider configured
  if (!activeProvider && !showSetup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">AI Vessel Companion</h1>
        </div>

        <div className="max-w-lg mx-auto text-center space-y-6 py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Connect Your AI</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              HarborMesh works with local AI models running on your PC. Your data never leaves your machine.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 max-w-md mx-auto text-left">
            <div className="p-3 rounded-lg bg-muted text-center">
              <Monitor className="h-6 w-6 mx-auto mb-1.5 text-primary" />
              <p className="text-xs font-medium">Ollama</p>
              <p className="text-[10px] text-muted-foreground">localhost:11434</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <Monitor className="h-6 w-6 mx-auto mb-1.5 text-primary" />
              <p className="text-xs font-medium">LM Studio</p>
              <p className="text-[10px] text-muted-foreground">localhost:1234</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <Zap className="h-6 w-6 mx-auto mb-1.5 text-primary" />
              <p className="text-xs font-medium">Any OpenAI API</p>
              <p className="text-[10px] text-muted-foreground">Compatible server</p>
            </div>
          </div>

          <Button size="lg" onClick={() => setShowSetup(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Detect & Connect
          </Button>
        </div>
      </div>
    );
  }

  if (showSetup && !activeProvider) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">AI Vessel Companion</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)}>Back</Button>
        </div>
        <QuickSetup onComplete={() => setShowSetup(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" /> AI Vessel Companion
          </h1>
          <p className="text-muted-foreground mt-1">Your intelligent assistant for vessel management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAgentMode(!agentMode)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              agentMode
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-muted-foreground border-border'
            )}
          >
            <Zap className="h-3 w-3" />
            Agent {agentMode ? 'ON' : 'OFF'}
          </button>
          <Badge variant="outline" className="text-xs">
            {activeProvider ? activeProvider.name : 'No Provider'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setActiveView('settings')}>
            <Settings className="h-4 w-4 mr-2" /> AI Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Actions (collapsible on mobile) */}
        <div className="space-y-4 lg:block">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.id} onClick={() => handleQuickAction(action.id)}
                    disabled={!activeProvider}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group disabled:cursor-not-allowed disabled:opacity-50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Connection</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {activeProvider && (
                  <>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span>{activeProvider.name}</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-xs text-muted-foreground">{activeProvider.chatModel}</span></div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Monitor className="h-3.5 w-3.5" /><span>{activeProvider.apiUrl}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100dvh-280px-4rem)] lg:h-[calc(100dvh-280px)] min-h-[500px] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">HarborMesh AI</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <span className={cn('w-2 h-2 rounded-full', activeProvider ? 'bg-emerald-500' : 'bg-amber-500')} />
                      {activeProvider?.chatModel ?? 'Not connected'}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setMessages([]); clearConversation(); }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Clear
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
              <div ref={scrollRef} className="h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="font-medium text-lg">How can I help you today?</h3>
                        <p className="text-muted-foreground mt-1">Ask about your vessel, maintenance, or navigation</p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div key={index} className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : '')}>
                          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                            message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-violet-500 to-purple-600')}>
                            {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-white" />}
                          </div>
                          <div className={cn('max-w-[80%] space-y-1', message.role === 'user' ? 'items-end' : '')}>
                            <div className={cn('rounded-2xl px-4 py-2.5', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                {message.content.split('\n\n').map((paragraph, i) => (
                                  <p key={i} className="mb-2 last:mb-0">
                                    {paragraph.split('\n').map((line, j) => (
                                      <React.Fragment key={j}>
                                        {line.startsWith('**') && line.endsWith('**')
                                          ? <strong>{line.replace(/\*\*/g, '')}</strong>
                                          : line.startsWith('- ') || line.startsWith('* ')
                                            ? <span className="block ml-4">{line}</span>
                                            : line}
                                        {j < paragraph.split('\n').length - 1 && <br />}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground px-2">{formatTime(message.timestamp)}</span>
                          </div>
                        </div>
                      ))
                    )}
                    {isProcessing && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>

            <CardContent className="border-t p-4">
              <div className="flex gap-2">
                {voice.isSupported && (
                  <Button
                    size="icon"
                    variant={voice.status === 'listening' ? 'destructive' : 'outline'}
                    className={cn('h-10 w-10 shrink-0', voice.status === 'listening' && 'animate-pulse')}
                    onClick={voice.toggle}
                    disabled={isProcessing}
                  >
                    {voice.status === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                <div className="flex-1 relative">
                  <Input ref={inputRef}
                    placeholder={voice.status === 'listening' ? 'Listening...' : 'Ask about your vessel...'}
                    value={voice.status === 'listening' ? (voice.interimTranscript || input) : input}
                    onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    className="pr-12" disabled={isProcessing || !activeProvider || voice.status === 'listening'} />
                  <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleSend} disabled={!input.trim() || isProcessing || !activeProvider}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {voice.error && <p className="text-xs text-red-500 mt-1">{voice.error}</p>}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Running locally via {activeProvider?.name ?? 'local AI'}. No data leaves your machine.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
