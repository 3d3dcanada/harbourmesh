import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VESSEL_TEMPLATES, type TemplateCategory, type VesselTemplate } from '@/lib/vessel-templates';

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  sailboat: 'Sailboats',
  powerboat: 'Powerboats',
  catamaran: 'Multihulls',
  workboat: 'Workboats',
  small_craft: 'Small Craft',
};

const CATEGORIES: TemplateCategory[] = ['sailboat', 'powerboat', 'catamaran', 'workboat', 'small_craft'];

interface TemplateChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: VesselTemplate) => void;
}

export function TemplateChooser({ open, onOpenChange, onSelect }: TemplateChooserProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('sailboat');
  const [hovered, setHovered] = useState<string | null>(null);

  const templates = VESSEL_TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle>Choose Vessel Template</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a starting hull shape. You can reshape it and customize spaces afterward.
          </p>
        </DialogHeader>

        <div className="flex border-b shrink-0 px-6 gap-1 pt-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-t-md border-b-2 transition-colors',
                activeCategory === cat
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => { onSelect(template); onOpenChange(false); }}
                onMouseEnter={() => setHovered(template.id)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-left',
                  hovered === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                )}
              >
                {/* Hull thumbnail */}
                <div className="w-full h-16 flex items-center justify-center">
                  <svg viewBox="0 0 80 30" className="w-full h-full">
                    <path
                      d={template.thumbnail}
                      fill="currentColor"
                      className="text-muted-foreground/60"
                      stroke="currentColor"
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>

                <div className="w-full">
                  <p className="text-sm font-medium leading-tight">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {template.lengthRange[0]}–{template.lengthRange[1]} ft
                  </p>
                  <Badge variant="secondary" className="text-[10px] mt-1 h-4">
                    {template.defaultSpaces.length} spaces
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-4 pt-2 border-t shrink-0 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
