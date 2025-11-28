'use client';

import { useToast } from '@/hooks/use-toast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-md pointer-events-none">
      {toasts.map((t) => {
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all animate-in slide-in-from-right-full duration-300",
              t.type === 'success' ? "bg-white border-green-200 dark:bg-slate-900 dark:border-green-900" :
              t.type === 'error' ? "bg-white border-red-200 dark:bg-slate-900 dark:border-red-900" :
              t.type === 'warning' ? "bg-white border-yellow-200 dark:bg-slate-900 dark:border-yellow-900" :
              "bg-white border-border dark:bg-slate-900"
            )}
          >
            <div className="shrink-0">
                {t.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {t.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                {t.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                {!t.type && <Info className="h-5 w-5 text-blue-500" />}
            </div>
            
            <div className="grid gap-1">
              {t.title && <h3 className="font-semibold leading-none tracking-tight">{t.title}</h3>}
              {t.description && (
                <div className="text-sm opacity-90">{t.description}</div>
              )}
            </div>

            <button
              onClick={() => dismiss(t.id)}
              className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}


