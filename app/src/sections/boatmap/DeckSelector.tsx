import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Space } from '@/types';

const DECK_LABELS: Record<number, string> = {
  '-2': 'Keel',
  '-1': 'Below Deck',
  '0': 'Main Deck',
  '1': 'Upper Deck',
  '2': 'Flybridge',
};

interface DeckSelectorProps {
  spaces: Space[];
  activeDeck: number;
  onDeckChange: (deck: number) => void;
}

export function DeckSelector({ spaces, activeDeck, onDeckChange }: DeckSelectorProps) {
  const deckSet = new Set(spaces.map((s) => s.deck ?? 0));
  // Always show main deck; add others from actual spaces
  [-2, -1, 0, 1, 2].forEach((d) => { if (deckSet.has(d)) deckSet.add(d); });
  const decks = Array.from(deckSet).sort((a, b) => b - a); // top deck first

  if (decks.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {decks.map((deck) => {
        const count = spaces.filter((s) => (s.deck ?? 0) === deck).length;
        return (
          <button
            key={deck}
            onClick={() => onDeckChange(deck)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors border',
              activeDeck === deck
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            {DECK_LABELS[deck] ?? `Deck ${deck}`}
            {count > 0 && (
              <Badge variant="secondary" className="h-4 w-4 justify-center p-0 text-[10px]">
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
