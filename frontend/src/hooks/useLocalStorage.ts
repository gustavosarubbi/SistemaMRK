'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
    // Estado para armazenar o valor
    // Passa função de inicialização para useState para que a lógica
    // seja executada apenas uma vez
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Erro ao ler localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Estado para indicar se está montado (SSR safety)
    const [isHydrated, setIsHydrated] = useState(false);

    // Marcar como hidratado após montagem
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Sincronizar com localStorage quando o valor muda
    useEffect(() => {
        if (typeof window === 'undefined' || !isHydrated) {
            return;
        }
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.warn(`Erro ao salvar localStorage key "${key}":`, error);
        }
    }, [key, storedValue, isHydrated]);

    // Função para atualizar o valor
    const setValue = useCallback((value: T | ((val: T) => T)) => {
        setStoredValue((prev) => {
            const valueToStore = value instanceof Function ? value(prev) : value;
            return valueToStore;
        });
    }, []);

    // Função para remover o valor
    const removeValue = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.warn(`Erro ao remover localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    // Escutar mudanças em outras abas
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.warn(`Erro ao parsear storage event para key "${key}":`, error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue, removeValue, isHydrated] as const;
}







