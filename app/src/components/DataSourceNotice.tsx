import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type DataSourceNoticeProps = {
  title: string;
  children: ReactNode;
};

export function DataSourceNotice({ title, children }: DataSourceNoticeProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100" role="status">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm opacity-90">{children}</p>
      </div>
    </div>
  );
}
