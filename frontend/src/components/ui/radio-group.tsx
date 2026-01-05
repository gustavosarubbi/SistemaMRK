'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupContextValue {
    value: string;
    onValueChange: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined);

interface RadioGroupProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

export function RadioGroup({ value, onValueChange, children, className }: RadioGroupProps) {
    return (
        <RadioGroupContext.Provider value={{ value, onValueChange }}>
            <div className={cn('space-y-2', className)}>
                {children}
            </div>
        </RadioGroupContext.Provider>
    );
}

interface RadioGroupItemProps {
    value: string;
    id: string;
    className?: string;
}

export function RadioGroupItem({ value, id, className }: RadioGroupItemProps) {
    const context = React.useContext(RadioGroupContext);
    if (!context) {
        throw new Error('RadioGroupItem must be used within RadioGroup');
    }
    
    const { value: selectedValue, onValueChange } = context;
    const isSelected = selectedValue === value;
    
    return (
        <button
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onValueChange(value)}
            className={cn(
                'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                isSelected && 'border-primary bg-primary',
                className
            )}
        >
            {isSelected && (
                <div className="flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                </div>
            )}
        </button>
    );
}


