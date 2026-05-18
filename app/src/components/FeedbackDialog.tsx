import { useState } from 'react';
import { MessageSquare, Send, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

const CATEGORIES = [
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500' },
  { id: 'question', label: 'Question', icon: HelpCircle, color: 'text-blue-500' },
  { id: 'other', label: 'Other', icon: MessageSquare, color: 'text-muted-foreground' },
] as const;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { activeView } = useAppStore();
  const [category, setCategory] = useState<string>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (message.trim().length < 5) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim() || undefined,
          page: activeView,
        }),
      });

      if (!res.ok) throw new Error('Failed to send');

      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setMessage('');
        setCategory('bug');
      }, 2000);
    } catch {
      setError('Could not send feedback. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/30 mb-4">
              <Send className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="font-semibold text-lg">Thanks for the feedback!</p>
            <p className="text-sm text-muted-foreground mt-1">We'll look into this.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Feedback
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors',
                    category === cat.id
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <Icon className={cn('h-5 w-5', cat.color)} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">What happened?</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                category === 'bug'
                  ? 'Describe the issue. What did you expect vs what happened?'
                  : category === 'feature'
                  ? 'What would you like to see added?'
                  : 'Tell us what\'s on your mind...'
              }
              className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Email (optional, for follow-up)</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-8"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={message.trim().length < 5 || submitting}
          >
            {submitting ? 'Sending...' : 'Send Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
