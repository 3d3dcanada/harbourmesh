import { AIProviderType, type AIProviderConfig } from '@/types';

export interface LocalAIServer {
  type: 'ollama' | 'lmstudio' | 'openai-compat' | 'nvidia';
  name: string;
  url: string;
  models: LocalAIModel[];
}

export interface LocalAIModel {
  id: string;
  name: string;
  size?: string;
  parameterSize?: string;
}

const PROBE_ENDPOINTS = [
  { url: 'http://localhost:11434', type: 'ollama' as const, name: 'Ollama' },
  { url: 'http://127.0.0.1:11434', type: 'ollama' as const, name: 'Ollama' },
  { url: 'http://localhost:1234', type: 'lmstudio' as const, name: 'LM Studio' },
  { url: 'http://127.0.0.1:1234', type: 'lmstudio' as const, name: 'LM Studio' },
];

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function probeOllama(baseUrl: string): Promise<LocalAIModel[]> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json() as { models?: Array<{ name: string; size?: number; details?: { parameter_size?: string } }> };
    return (data.models ?? []).map((m) => ({
      id: m.name,
      name: m.name.split(':')[0],
      size: m.size ? `${(m.size / 1e9).toFixed(1)}GB` : undefined,
      parameterSize: m.details?.parameter_size,
    }));
  } catch {
    return [];
  }
}

async function probeLMStudio(baseUrl: string): Promise<LocalAIModel[]> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/v1/models`);
    if (!res.ok) return [];
    const data = await res.json() as { data?: Array<{ id: string; owned_by?: string }> };
    return (data.data ?? []).map((m) => ({
      id: m.id,
      name: m.id.split('/').pop()?.replace(/-/g, ' ') ?? m.id,
    }));
  } catch {
    return [];
  }
}

export async function detectLocalServers(): Promise<LocalAIServer[]> {
  const results: LocalAIServer[] = [];
  const seen = new Set<string>();

  const probes = PROBE_ENDPOINTS.map(async (endpoint) => {
    try {
      const models = endpoint.type === 'ollama'
        ? await probeOllama(endpoint.url)
        : await probeLMStudio(endpoint.url);

      if (models.length > 0 && !seen.has(endpoint.type)) {
        seen.add(endpoint.type);
        results.push({
          type: endpoint.type,
          name: endpoint.name,
          url: endpoint.url,
          models,
        });
      }
    } catch {
      // Server not running, skip
    }
  });

  await Promise.allSettled(probes);
  return results;
}

export function serverToProvider(server: LocalAIServer, modelId: string): AIProviderConfig {
  return {
    id: crypto.randomUUID(),
    providerType: server.type === 'ollama' ? AIProviderType.LOCAL : AIProviderType.CUSTOM,
    name: `${server.name} - ${modelId.split(':')[0]}`,
    apiUrl: server.url,
    chatModel: modelId,
    capabilities: [
      { type: 'chat', supported: true, modelName: modelId },
    ],
    defaultForChat: true,
    defaultForVision: false,
    defaultForEmbeddings: false,
    isActive: true,
  };
}

export const NVIDIA_NIM_MODELS: LocalAIModel[] = [
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', parameterSize: '1T MoE' },
  { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', parameterSize: '671B' },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', parameterSize: '70B' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', parameterSize: '17B' },
  { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', parameterSize: '27B' },
  { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2', parameterSize: '123B' },
];

export function createNvidiaProvider(modelId: string, apiKey: string): AIProviderConfig {
  return {
    id: crypto.randomUUID(),
    providerType: AIProviderType.CUSTOM,
    name: `NVIDIA - ${modelId.split('/').pop()}`,
    apiUrl: 'https://integrate.api.nvidia.com',
    apiKey,
    chatModel: modelId,
    capabilities: [{ type: 'chat', supported: true, modelName: modelId }],
    defaultForChat: true,
    defaultForVision: false,
    defaultForEmbeddings: false,
    isActive: true,
  };
}

export const HARBORMESH_SYSTEM_PROMPT = `You are HarborMesh AI Companion, a knowledgeable marine vessel assistant built into the HarborMesh boating platform.

Your role:
- Help with vessel management, maintenance planning, and troubleshooting
- Provide navigation guidance and weather interpretation
- Explain marine systems (engines, electrical, plumbing, rigging)
- Help with inventory management and document organization
- Offer safety advice and best practices for boating

Guidelines:
- Be concise and practical. Boaters need clear answers, not essays.
- Use proper nautical terminology but explain it when needed.
- For safety-critical topics (navigation, weather, equipment failure), always recommend consulting official sources and professional help.
- You have access to the vessel's current data (position, speed, heading, depth, wind) when available.
- Reference specific vessel details when the user has configured them.
- If asked about something outside your marine knowledge, say so honestly.

You are running locally on the user's device. No data leaves their machine.`;
