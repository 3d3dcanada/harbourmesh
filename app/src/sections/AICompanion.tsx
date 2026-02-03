/**
 * HarborMesh - AI Companion Section
 * AI-powered vessel assistant for guidance, explanations, and automation
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  Wrench,
  Navigation,
  FileText,
  MessageSquare,
  Settings,
  ChevronRight,
  Lightbulb,
  Loader2,
  User,
  Ship,
  CheckCircle2,
  AlertTriangle,
  Zap,
  History,
  Trash2,
  Mic,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAIStore, useAppStore } from '@/store';

// Quick action suggestions
const quickActions = [
  {
    id: 'onboard',
    title: 'Help me onboard my vessel',
    description: 'Guide through initial setup and configuration',
    icon: Ship,
  },
  {
    id: 'systems',
    title: 'Explain my vessel systems',
    description: 'Learn about engines, electrical, plumbing, etc.',
    icon: Wrench,
  },
  {
    id: 'maintenance',
    title: 'Create maintenance schedule',
    description: 'Generate tasks based on manufacturer recommendations',
    icon: CheckCircle2,
  },
  {
    id: 'navigation',
    title: 'Plan a voyage',
    description: 'Get routing advice and weather considerations',
    icon: Navigation,
  },
  {
    id: 'documents',
    title: 'Summarize my documents',
    description: 'Extract key info from manuals and certificates',
    icon: FileText,
  },
  {
    id: 'troubleshoot',
    title: 'Troubleshoot an issue',
    description: 'Get help diagnosing and fixing problems',
    icon: AlertTriangle,
  },
];

// Example conversation
const exampleConversation = [
  {
    role: 'assistant' as const,
    content: 'Hello! I\'m your HarborMesh AI companion. I can help you with:\n\n• Understanding your vessel systems\n• Creating maintenance schedules\n• Planning voyages and routes\n• Answering questions about boating\n• Summarizing documents and logs\n\nWhat would you like to know about your vessel today?',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    role: 'user' as const,
    content: 'What maintenance should I do on my Yanmar 3YM30 engine?',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    role: 'assistant' as const,
    content: `Based on your Yanmar 3YM30 engine manual, here are the key maintenance tasks:\n\n**Every 50 hours or monthly:**
• Check engine oil level
• Inspect raw water strainer
• Check coolant level\n\n**Every 250 hours or annually:**
• Change engine oil and filter
• Replace fuel filter
• Inspect and adjust drive belts
• Check zinc anodes\n\n**Every 500 hours or 2 years:**
• Replace raw water pump impeller
• Change coolant
• Inspect heat exchanger\n\nYour engine currently shows 1,250.5 hours. Would you like me to create scheduled tasks for upcoming maintenance?`,
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export function AICompanion() {
  const { conversation, addMessage, clearConversation, isProcessing, setProcessing } = useAIStore();
  const { addNotification } = useAppStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(exampleConversation);
  const [streamingMessage, setStreamingMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setProcessing(true);
    
    // Simulate AI response with streaming
    const responses: Record<string, string> = {
      'onboard': `I'd be happy to help you onboard your vessel! Let's start with the basics:\n\n1. **Vessel Details**: First, let's confirm your vessel information in the Vessel section\n2. **Create Spaces**: Map out your boat's compartments and storage areas\n3. **Add Inventory**: Track safety equipment, spares, and supplies\n4. **Upload Documents**: Store manuals, registrations, and certificates\n5. **Set Up Systems**: Document your engine, electrical, and plumbing systems\n\nWould you like me to guide you through any of these steps?`,
      
      'systems': `Your vessel has several key systems:\n\n**Propulsion**: Yanmar 3YM30 diesel engine with saildrive\n**Electrical**: 12V DC system with house and start batteries\n**Plumbing**: Fresh water, black water, and bilge systems\n**Navigation**: GPS, chart plotter, VHF radio, AIS\n**Safety**: Life jackets, fire extinguishers, flares, EPIRB\n\nWhich system would you like to learn more about?`,
      
      'maintenance': `I'll create a maintenance schedule based on your vessel's systems. Here are the tasks I'm adding:\n\n**Engine (Yanmar 3YM30)**
- Oil change (every 250 hrs) - Due in 4.5 hours\n- Fuel filter replacement (every 500 hrs) - Due in 249.5 hours\n- Raw water impeller (every 1000 hrs) - Due in 749.5 hours\n\n**Safety Equipment**
- Fire extinguisher inspection (annual) - Due in 3 months\n- Flare expiration check - Due in 18 months\n- EPIRB battery test (annual) - Due in 2 months\n\nI've added these to your Tasks. Would you like me to set up reminders?`,
      
      'default': `I understand you're asking about "${input.trim()}". As your AI companion, I can help with:\n\n• Explaining vessel systems and procedures\n• Creating maintenance schedules\n• Summarizing documents and logs\n• Providing boating best practices\n• Troubleshooting common issues\n\nCould you provide more details about what you'd like to know?`,
    };
    
    // Determine which response to use
    const lowerInput = input.toLowerCase();
    let responseKey = 'default';
    if (lowerInput.includes('onboard') || lowerInput.includes('setup')) responseKey = 'onboard';
    else if (lowerInput.includes('system') || lowerInput.includes('engine')) responseKey = 'systems';
    else if (lowerInput.includes('maintenance') || lowerInput.includes('schedule')) responseKey = 'maintenance';
    
    const response = responses[responseKey];
    
    // Stream the response
    setStreamingMessage('');
    const words = response.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      setStreamingMessage((prev) => prev + (i > 0 ? ' ' : '') + words[i]);
    }
    
    const assistantMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, assistantMessage]);
    setStreamingMessage('');
    setProcessing(false);
    
    // Add to persistent store
    addMessage('user', userMessage.content);
    addMessage('assistant', response);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleQuickAction = (actionId: string) => {
    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      setInput(action.title);
      inputRef.current?.focus();
    }
  };
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            AI Vessel Companion
          </h1>
          <p className="text-muted-foreground mt-1">
            Your intelligent assistant for vessel management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Local AI Active
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            AI Settings
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.id)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
          
          {/* Capabilities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Local processing (offline)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Document analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>System explanations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Maintenance guidance</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-280px)] min-h-[500px] flex flex-col">
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">HarborMesh AI</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Online • Local Model
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setMessages([]);
                    clearConversation();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </CardHeader>
            
            {/* Messages */}
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full" ref={scrollRef}>
                <div className="p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                      <h3 className="font-medium text-lg">How can I help you today?</h3>
                      <p className="text-muted-foreground mt-1">
                        Ask me about your vessel, maintenance, or navigation
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex gap-3',
                          message.role === 'user' ? 'flex-row-reverse' : ''
                        )}
                      >
                        <div className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-gradient-to-br from-violet-500 to-purple-600'
                        )}>
                          {message.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className={cn(
                          'max-w-[80%] space-y-1',
                          message.role === 'user' ? 'items-end' : ''
                        )}>
                          <div className={cn(
                            'rounded-2xl px-4 py-2.5',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              {message.content.split('\n\n').map((paragraph, i) => (
                                <p key={i} className="mb-2 last:mb-0">
                                  {paragraph.split('\n').map((line, j) => (
                                    <React.Fragment key={j}>
                                      {line.startsWith('**') && line.endsWith('**') ? (
                                        <strong>{line.replace(/\*\*/g, '')}</strong>
                                      ) : line.startsWith('•') ? (
                                        <span className="block ml-4">{line}</span>
                                      ) : (
                                        line
                                      )}
                                      {j < paragraph.split('\n').length - 1 && <br />}
                                    </React.Fragment>
                                  ))}
                                </p>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground px-2">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {/* Streaming message */}
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
                  
                  {/* Processing indicator */}
                  {isProcessing && !streamingMessage && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            
            {/* Input Area */}
            <CardContent className="border-t p-4">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <Mic className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    placeholder="Ask about your vessel..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pr-12"
                    disabled={isProcessing}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleSend}
                    disabled={!input.trim() || isProcessing}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                AI responses are generated locally. Never sends sensitive data to cloud without permission.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
