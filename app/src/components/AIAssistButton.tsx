import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, useAIStore } from '@/store';

interface AIAssistButtonProps {
  prompt: string;
  label?: string;
  size?: 'sm' | 'default';
}

export function AIAssistButton({ prompt, label, size = 'sm' }: AIAssistButtonProps) {
  const { setActiveView } = useAppStore();
  const { activeProvider, addMessage } = useAIStore();

  const handleClick = () => {
    if (activeProvider) {
      addMessage('user', prompt);
    }
    setActiveView('ai');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            className="gap-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            onClick={handleClick}
          >
            <Bot className="h-3.5 w-3.5" />
            {label && <span className="text-xs">{label}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Ask AI: {prompt}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
