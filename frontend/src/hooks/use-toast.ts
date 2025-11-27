import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = {
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
};

function notify() {
  listeners.forEach((listener) => listener({ ...memoryState }));
}

export function toast(props: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast = { ...props, id };
  
  memoryState = {
    ...memoryState,
    toasts: [...memoryState.toasts, newToast],
  };
  notify();

  if (props.duration !== Infinity) {
    setTimeout(() => {
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.filter((t) => t.id !== id),
      };
      notify();
    }, props.duration || 3000);
  }
}

export function useToast() {
  const [state, setState] = useState<ToastState>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss: (id: string) => {
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.filter((t) => t.id !== id),
      };
      notify();
    },
  };
}

