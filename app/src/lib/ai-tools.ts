import { useVesselStore, useLogTaskStore, useAppStore } from '@/store';
import { useAnchorWatchStore } from '@/store/anchorWatchStore';
import { ItemCategory, SpaceType, TaskStatus, type Space, type Item, type LogEntry, type Task } from '@/types';

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean; enum?: string[] }>;
  execute: (args: Record<string, unknown>) => string;
}

function vesselRequired(): string | null {
  const vessel = useVesselStore.getState().currentVessel;
  if (!vessel) return 'No vessel is currently selected. Please create or select a vessel first.';
  return null;
}

export const AI_TOOLS: AITool[] = [
  {
    name: 'get_vessel_summary',
    description: 'Get a complete summary of the current vessel including specs, engines, tanks, and status',
    parameters: {},
    execute: () => {
      const vessel = useVesselStore.getState().currentVessel;
      if (!vessel) return 'No vessel configured yet.';
      const { items, spaces } = useVesselStore.getState();
      const { tasks } = useLogTaskStore.getState();
      const openTasks = tasks.filter(t => t.status !== 'complete').length;
      const lines = [
        `Vessel: ${vessel.name}`,
        `Type: ${vessel.type.replace(/_/g, ' ')}`,
        vessel.lengthOverall ? `LOA: ${vessel.lengthOverall}m, Beam: ${vessel.beam}m, Draft: ${vessel.draft}m` : '',
        vessel.displacement ? `Displacement: ${vessel.displacement}kg` : '',
        vessel.engines.length > 0 ? `Engines: ${vessel.engines.map(e => `${e.name} (${e.make ?? ''} ${e.model ?? ''}, ${e.hours.toFixed(0)}hrs)`).join('; ')}` : 'No engines configured',
        vessel.tanks.length > 0 ? `Tanks: ${vessel.tanks.map(t => `${t.name}: ${t.currentLevel ?? '?'}/${t.capacity}L ${t.type}`).join('; ')}` : '',
        `Spaces: ${spaces.filter(s => s.vesselId === vessel.id).length}`,
        `Inventory items: ${items.filter(i => i.vesselId === vessel.id).length}`,
        `Open tasks: ${openTasks}`,
      ];
      return lines.filter(Boolean).join('\n');
    },
  },

  {
    name: 'update_vessel',
    description: 'Update vessel details like name, dimensions, or registration info',
    parameters: {
      name: { type: 'string', description: 'New vessel name' },
      lengthOverall: { type: 'number', description: 'Length overall in meters' },
      beam: { type: 'number', description: 'Beam width in meters' },
      draft: { type: 'number', description: 'Draft depth in meters' },
    },
    execute: (args) => {
      const err = vesselRequired();
      if (err) return err;
      const vessel = useVesselStore.getState().currentVessel!;
      const updates: Record<string, unknown> = {};
      if (args.name) updates.name = args.name;
      if (args.lengthOverall) updates.lengthOverall = Number(args.lengthOverall);
      if (args.beam) updates.beam = Number(args.beam);
      if (args.draft) updates.draft = Number(args.draft);
      useVesselStore.getState().updateVessel(vessel.id, updates);
      return `Updated vessel "${vessel.name}" with: ${Object.keys(updates).join(', ')}`;
    },
  },

  {
    name: 'add_space',
    description: 'Add a new space/area to the boat map (e.g., cabin, locker, galley)',
    parameters: {
      name: { type: 'string', description: 'Name of the space', required: true },
      type: { type: 'string', description: 'Type of space', required: true, enum: Object.values(SpaceType) },
      deck: { type: 'number', description: 'Deck number (0 = main deck)' },
    },
    execute: (args) => {
      const err = vesselRequired();
      if (err) return err;
      const vessel = useVesselStore.getState().currentVessel!;
      const space: Space = {
        id: crypto.randomUUID(),
        vesselId: vessel.id,
        name: String(args.name),
        type: (args.type as SpaceType) || SpaceType.COMPARTMENT,
        deck: Number(args.deck ?? 0),
        deckName: 'Main Deck',
        geometry: { kind: 'rect', x: 320, y: 120, width: 120, height: 48 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useVesselStore.getState().addSpace(space);
      return `Added space "${space.name}" (${space.type}) to ${vessel.name}`;
    },
  },

  {
    name: 'add_item',
    description: 'Add an inventory item to a space on the vessel',
    parameters: {
      name: { type: 'string', description: 'Item name', required: true },
      category: { type: 'string', description: 'Item category', required: true, enum: Object.values(ItemCategory) },
      quantity: { type: 'number', description: 'Quantity', required: true },
      unit: { type: 'string', description: 'Unit of measure (pcs, kg, L, ft, etc.)' },
      spaceName: { type: 'string', description: 'Name of the space to put it in' },
      manufacturer: { type: 'string', description: 'Manufacturer name' },
      partNumber: { type: 'string', description: 'Part number' },
    },
    execute: (args) => {
      const err = vesselRequired();
      if (err) return err;
      const vessel = useVesselStore.getState().currentVessel!;
      const { spaces } = useVesselStore.getState();
      let spaceId = 'unassigned';
      if (args.spaceName) {
        const match = spaces.find(s => s.vesselId === vessel.id && s.name.toLowerCase().includes(String(args.spaceName).toLowerCase()));
        if (match) spaceId = match.id;
      }
      const item: Item = {
        id: crypto.randomUUID(),
        vesselId: vessel.id,
        spaceId,
        category: (args.category as ItemCategory) || ItemCategory.CUSTOM,
        name: String(args.name),
        quantity: Number(args.quantity ?? 1),
        unit: String(args.unit ?? 'pcs'),
        manufacturer: args.manufacturer ? String(args.manufacturer) : undefined,
        partNumber: args.partNumber ? String(args.partNumber) : undefined,
        tags: [],
        relatedSystemIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useVesselStore.getState().addItem(item);
      return `Added ${item.quantity} ${item.unit} of "${item.name}" to inventory`;
    },
  },

  {
    name: 'search_inventory',
    description: 'Search for items across all spaces by name, category, or manufacturer',
    parameters: {
      query: { type: 'string', description: 'Search text to match against item names, categories, or manufacturers', required: true },
    },
    execute: (args) => {
      const err = vesselRequired();
      if (err) return err;
      const vessel = useVesselStore.getState().currentVessel!;
      const { items, spaces } = useVesselStore.getState();
      const q = String(args.query).toLowerCase();
      const matches = items.filter(i =>
        i.vesselId === vessel.id && (
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.manufacturer?.toLowerCase().includes(q)) ||
          (i.partNumber?.toLowerCase().includes(q))
        )
      );
      if (matches.length === 0) return `No items found matching "${args.query}"`;
      return matches.map(i => {
        const space = spaces.find(s => s.id === i.spaceId);
        return `- ${i.name} (${i.quantity} ${i.unit}) in ${space?.name ?? 'unassigned'} [${i.category}]`;
      }).join('\n');
    },
  },

  {
    name: 'create_log',
    description: 'Create a log entry (voyage, maintenance, incident, fueling, etc.)',
    parameters: {
      type: { type: 'string', description: 'Log type', required: true, enum: ['voyage', 'maintenance', 'incident', 'fueling', 'inspection', 'weather_observation', 'crew_change', 'system_check', 'engine_hours'] },
      summary: { type: 'string', description: 'Brief summary of the log entry', required: true },
      details: { type: 'string', description: 'Detailed notes' },
    },
    execute: (args) => {
      const err = vesselRequired();
      if (err) return err;
      const vessel = useVesselStore.getState().currentVessel!;
      const log: LogEntry = {
        id: crypto.randomUUID(),
        vesselId: vessel.id,
        type: String(args.type) as LogEntry['type'],
        timestamp: new Date().toISOString(),
        summary: String(args.summary),
        details: args.details ? String(args.details) : undefined,
        createdBy: 'ai-companion',
        createdByName: 'AI Companion',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useLogTaskStore.getState().addLog(log);
      return `Created ${log.type} log: "${log.summary}"`;
    },
  },

  {
    name: 'create_task',
    description: 'Create a maintenance or to-do task for the vessel',
    parameters: {
      title: { type: 'string', description: 'Task title', required: true },
      description: { type: 'string', description: 'Task details' },
      dueDate: { type: 'string', description: 'Due date in ISO format (YYYY-MM-DD)' },
      type: { type: 'string', description: 'Task type', enum: ['maintenance', 'inspection', 'provisioning', 'safety_drill', 'cleaning', 'upgrade', 'repair', 'administrative', 'custom'] },
    },
    execute: (args) => {
      const err = vesselRequired();
      if (err) return err;
      const vessel = useVesselStore.getState().currentVessel!;
      const task: Task = {
        id: crypto.randomUUID(),
        vesselId: vessel.id,
        title: String(args.title),
        description: args.description ? String(args.description) : undefined,
        type: (args.type as Task['type']) ?? 'maintenance',
        status: TaskStatus.OPEN,
        dueDate: args.dueDate ? String(args.dueDate) : undefined,
        createdBy: 'ai-companion',
        requiresApproval: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useLogTaskStore.getState().addTask(task);
      return `Created task: "${task.title}"${task.dueDate ? ` (due ${task.dueDate})` : ''}`;
    },
  },

  {
    name: 'suggest_maintenance',
    description: 'Analyze vessel systems and suggest maintenance tasks based on engine hours and age',
    parameters: {},
    execute: () => {
      const vessel = useVesselStore.getState().currentVessel;
      if (!vessel) return 'No vessel configured.';
      const suggestions: string[] = [];
      for (const engine of vessel.engines) {
        if (engine.hours > 100) suggestions.push(`${engine.name}: Oil change recommended (${engine.hours.toFixed(0)} hrs)`);
        if (engine.hours > 200) suggestions.push(`${engine.name}: Impeller inspection due (${engine.hours.toFixed(0)} hrs)`);
        if (engine.hours > 500) suggestions.push(`${engine.name}: Full service due (${engine.hours.toFixed(0)} hrs)`);
      }
      if (vessel.engines.length === 0) suggestions.push('No engines configured. Add engines to get maintenance suggestions.');
      if (suggestions.length === 0) suggestions.push('All systems look good. No maintenance needed at this time.');
      return suggestions.join('\n');
    },
  },

  {
    name: 'set_anchor_watch',
    description: 'Set up an anchor watch alarm with a specified radius',
    parameters: {
      radius: { type: 'number', description: 'Watch radius in meters', required: true },
    },
    execute: (args) => {
      const radius = Number(args.radius ?? 50);
      const store = useAnchorWatchStore.getState();
      store.setMaxRadius(radius);
      return `Anchor watch radius set to ${radius}m. Drop anchor from the Navigation section to activate.`;
    },
  },

  {
    name: 'navigate_to',
    description: 'Navigate to a specific section of HarborMesh (dashboard, vessel, map, inventory, documents, logs, navigation, community, ai, settings)',
    parameters: {
      section: { type: 'string', description: 'Section to navigate to', required: true, enum: ['dashboard', 'vessel', 'map', 'inventory', 'documents', 'logs', 'navigation', 'community', 'ai', 'settings'] },
    },
    execute: (args) => {
      useAppStore.getState().setActiveView(String(args.section) as never);
      return `Navigated to ${args.section}`;
    },
  },

  {
    name: 'explain_system',
    description: 'Explain a vessel system in educational detail (engines, electrical, plumbing, rigging, navigation, safety, hull, sails)',
    parameters: {
      system: { type: 'string', description: 'System to explain', required: true },
    },
    execute: (args) => {
      const system = String(args.system).toLowerCase();
      const explanations: Record<string, string> = {
        engine: 'Marine engines require regular oil changes (every 100hrs), impeller replacement (annually), fuel filter changes, and coolant checks. Monitor engine hours, temperature, and oil pressure.',
        electrical: 'Marine electrical systems run on 12V DC (house) and sometimes 120V AC (shore power). Key components: batteries, alternator, charger, distribution panel, and shore power inlet.',
        plumbing: 'Marine plumbing includes raw water (seawater cooling), freshwater (potable), and waste (holding tank). Check thru-hulls regularly and exercise seacocks.',
        rigging: 'Standing rigging (shrouds, stays) supports the mast. Running rigging (halyards, sheets) controls sails. Inspect for chafe, corrosion, and fatigue annually.',
        navigation: 'Key instruments: chartplotter, depth sounder, radar, AIS, VHF radio, compass. Always carry paper charts as backup.',
        safety: 'Required safety equipment: PFDs for all aboard, flares, fire extinguishers, throwable device, horn/whistle, navigation lights, first aid kit.',
        hull: 'Hull maintenance: bottom paint (annually), zinc anodes (check every haul-out), osmotic blister inspection, keel bolt torque check.',
        sails: 'Sail care: rinse with fresh water after saltwater exposure, check for UV damage, inspect stitching and hardware. Store dry.',
      };
      return explanations[system] ?? `I can explain: ${Object.keys(explanations).join(', ')}. Which system would you like to learn about?`;
    },
  },
];

export function buildToolDefinitions(): string {
  return AI_TOOLS.map(tool => {
    const params = Object.entries(tool.parameters)
      .map(([name, p]) => `  - ${name} (${p.type}${p.required ? ', required' : ''}): ${p.description}${p.enum ? ` [options: ${p.enum.join(', ')}]` : ''}`)
      .join('\n');
    return `### ${tool.name}\n${tool.description}\n${params ? `Parameters:\n${params}` : 'No parameters required.'}`;
  }).join('\n\n');
}

export function parseToolCall(content: string): { toolName: string; args: Record<string, unknown> } | null {
  const match = content.match(/\[TOOL_CALL:\s*(\w+)\((.*?)\)\]/s);
  if (!match) return null;
  const toolName = match[1];
  const argsStr = match[2].trim();
  if (!argsStr) return { toolName, args: {} };
  try {
    const args = JSON.parse(`{${argsStr}}`);
    return { toolName, args };
  } catch {
    const args: Record<string, unknown> = {};
    for (const pair of argsStr.split(',')) {
      const [key, ...rest] = pair.split(':');
      if (key && rest.length) {
        args[key.trim().replace(/"/g, '')] = rest.join(':').trim().replace(/^"|"$/g, '');
      }
    }
    return { toolName, args };
  }
}

export function executeToolCall(toolName: string, args: Record<string, unknown>): string {
  const tool = AI_TOOLS.find(t => t.name === toolName);
  if (!tool) return `Unknown tool: ${toolName}. Available tools: ${AI_TOOLS.map(t => t.name).join(', ')}`;
  return tool.execute(args);
}
