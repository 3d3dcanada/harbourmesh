/**
 * HarborMesh - AI Companion Section
 * AI-powered vessel assistant for guidance, explanations, and automation
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Sparkles, Wrench, Navigation, FileText,
  Settings, ChevronRight, Lightbulb, Loader2, User, Ship,
  CheckCircle2, AlertTriangle, Zap, Trash2, Mic,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAIStore, useAppStore } from '@/store';
import { AIProviderType, type AIProviderConfig } from '@/types';

// Quick action suggestions
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
  isStreaming?: boolean;
}

async function requestProviderChat(provider: AIProviderConfig, messages: Message[]): Promise<string> {
  const baseUrl = provider.apiUrl.replace(/\/+$/, '');
  const latestMessages = messages.slice(-12).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (provider.providerType === AIProviderType.LOCAL) {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.chatModel || provider.capabilities.find((capability) => capability.type === 'chat')?.modelName || 'llama3.1',
        messages: latestMessages,
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
      messages: latestMessages,
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

export function AICompanion() {
  const { activeProvider, addMessage, clearConversation, isProcessing, setProcessing } = useAIStore();
  const setActiveView = useAppStore((s) => s.setActiveView);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom — query the ScrollArea viewport for proper scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewport = el.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const target = viewport || el;
    target.scrollTop = target.scrollHeight;
  }, [messages, streamingMessage]);

  // Focus input on mount
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
      const response = await requestProviderChat(activeProvider, nextMessages);
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
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1" /> {activeProvider ? activeProvider.name : 'No Provider'}
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" /> AI Settings
          </Button>
        </div>
      </div>

      {/* No-provider banner */}
      {!activeProvider && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm text-amber-900 dark:text-amber-100">No AI provider configured</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Add a local Ollama instance or API key in Settings to enable AI features.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveView('settings')}>
            Configure AI
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Actions */}
        <div className="space-y-4">
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
            <CardHeader className="pb-3"><CardTitle className="text-sm">Capabilities</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {activeProvider ? (
                  <>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span>{activeProvider.providerType} provider selected</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span>Chat endpoint configured</span></div>
                  </>
                ) : (
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><span>Add a provider in Settings</span></div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-280px)] min-h-[500px] flex flex-col">
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
                      {activeProvider ? `${activeProvider.providerType} provider ready` : 'Provider not configured'}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setMessages([]); clearConversation(); }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Clear
                </Button>
              </div>
            </CardHeader>

            {/* Messages — ref on outer div, ScrollArea inside for proper Radix compat */}
            <CardContent className="flex-1 overflow-hidden p-0">
              <div ref={scrollRef} className="h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="font-medium text-lg">
                          {activeProvider ? 'How can I help you today?' : 'Connect an AI provider first'}
                        </h3>
                        <p className="text-muted-foreground mt-1">
                          {activeProvider
                            ? 'Ask me about your vessel, maintenance, or navigation'
                            : 'The companion stays inactive until Settings has a selected provider.'}
                        </p>
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
                                          : line.startsWith('•')
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
                    {streamingMessage && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="max-w-[80%]">
                          <div className="rounded-2xl px-4 py-2.5 bg-muted">
                            <p>{streamingMessage}</p>
                            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                          </div>
                        </div>
                      </div>
                    )}
                    {isProcessing && !streamingMessage && (
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

            {/* Input Area */}
            <CardContent className="border-t p-4">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="flex-shrink-0"><ImageIcon className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="flex-shrink-0"><Mic className="h-4 w-4" /></Button>
                <div className="flex-1 relative">
                  <Input ref={inputRef} placeholder="Ask about your vessel..." value={input}
                    onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} className="pr-12" disabled={isProcessing || !activeProvider} />
                  <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleSend} disabled={!input.trim() || isProcessing || !activeProvider}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {activeProvider
                  ? 'Messages are sent only to the selected provider endpoint.'
                  : 'No AI requests are made until a provider is selected in Settings.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
