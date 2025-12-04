'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';

/**
 * Hook que retorna um valor com debounce
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook que retorna uma função com debounce usando use-debounce
 */
export function useDebouncedFunction<T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T,
    delay: number
) {
    return useDebouncedCallback(callback, delay);
}

/**
 * Hook para estado com debounce na atualização
 * Útil para campos de busca onde queremos atualizar o estado interno imediatamente
 * mas disparar a busca apenas após o delay
 */
export function useDebouncedState<T>(
    initialValue: T,
    delay: number,
    onDebouncedChange?: (value: T) => void
): [T, T, (value: T) => void] {
    const [value, setValue] = useState<T>(initialValue);
    const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleChange = useCallback((newValue: T) => {
        setValue(newValue);
        
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
            setDebouncedValue(newValue);
            onDebouncedChange?.(newValue);
        }, delay);
    }, [delay, onDebouncedChange]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return [value, debouncedValue, handleChange];
}

