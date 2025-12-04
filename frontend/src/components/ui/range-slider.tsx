"use client"

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface RangeSliderProps {
    min: number;
    max: number;
    step?: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    label?: string;
    formatValue?: (value: number) => string;
    showInputs?: boolean;
    className?: string;
    colorStops?: { value: number; color: string }[];
}

export function RangeSlider({
    min,
    max,
    step = 1,
    value,
    onChange,
    label,
    formatValue = (v) => String(v),
    showInputs = true,
    className,
    colorStops,
}: RangeSliderProps) {
    const [localValue, setLocalValue] = React.useState(value);
    const trackRef = React.useRef<HTMLDivElement>(null);

    // Sync local value with prop
    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const getPercent = (val: number) => {
        return ((val - min) / (max - min)) * 100;
    };

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!trackRef.current) return;
        
        const rect = trackRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const clickValue = Math.round((percent * (max - min) + min) / step) * step;
        
        // Determine which handle to move based on proximity
        const distToMin = Math.abs(clickValue - localValue[0]);
        const distToMax = Math.abs(clickValue - localValue[1]);
        
        if (distToMin <= distToMax) {
            const newValue: [number, number] = [Math.min(clickValue, localValue[1]), localValue[1]];
            setLocalValue(newValue);
            onChange(newValue);
        } else {
            const newValue: [number, number] = [localValue[0], Math.max(clickValue, localValue[0])];
            setLocalValue(newValue);
            onChange(newValue);
        }
    };

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMin = Math.max(min, Math.min(Number(e.target.value), localValue[1]));
        const newValue: [number, number] = [newMin, localValue[1]];
        setLocalValue(newValue);
        onChange(newValue);
    };

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMax = Math.min(max, Math.max(Number(e.target.value), localValue[0]));
        const newValue: [number, number] = [localValue[0], newMax];
        setLocalValue(newValue);
        onChange(newValue);
    };

    const handleMinSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMin = Math.min(Number(e.target.value), localValue[1] - step);
        const newValue: [number, number] = [newMin, localValue[1]];
        setLocalValue(newValue);
        onChange(newValue);
    };

    const handleMaxSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMax = Math.max(Number(e.target.value), localValue[0] + step);
        const newValue: [number, number] = [localValue[0], newMax];
        setLocalValue(newValue);
        onChange(newValue);
    };

    // Generate gradient based on color stops
    const getTrackGradient = () => {
        if (!colorStops || colorStops.length === 0) {
            return 'bg-primary';
        }
        
        const sortedStops = [...colorStops].sort((a, b) => a.value - b.value);
        const gradientStops = sortedStops.map(stop => {
            const percent = getPercent(stop.value);
            return `${stop.color} ${percent}%`;
        });
        
        return `linear-gradient(to right, ${gradientStops.join(', ')})`;
    };

    const minPercent = getPercent(localValue[0]);
    const maxPercent = getPercent(localValue[1]);

    return (
        <div className={cn("space-y-3", className)}>
            {label && (
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">
                        {formatValue(localValue[0])} - {formatValue(localValue[1])}
                    </span>
                </div>
            )}
            
            {/* Slider Track */}
            <div className="relative h-6 flex items-center">
                {/* Background track */}
                <div 
                    ref={trackRef}
                    className="absolute w-full h-2 bg-muted rounded-full cursor-pointer"
                    onClick={handleTrackClick}
                />
                
                {/* Active range */}
                <div 
                    className="absolute h-2 bg-primary rounded-full pointer-events-none"
                    style={{
                        left: `${minPercent}%`,
                        width: `${maxPercent - minPercent}%`,
                        background: colorStops ? getTrackGradient() : undefined,
                    }}
                />
                
                {/* Min slider */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={localValue[0]}
                    onChange={handleMinSlider}
                    className={cn(
                        "absolute w-full h-2 appearance-none bg-transparent pointer-events-none",
                        "[&::-webkit-slider-thumb]:pointer-events-auto",
                        "[&::-webkit-slider-thumb]:appearance-none",
                        "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                        "[&::-webkit-slider-thumb]:rounded-full",
                        "[&::-webkit-slider-thumb]:bg-primary",
                        "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background",
                        "[&::-webkit-slider-thumb]:shadow-md",
                        "[&::-webkit-slider-thumb]:cursor-pointer",
                        "[&::-webkit-slider-thumb]:transition-transform",
                        "[&::-webkit-slider-thumb]:hover:scale-110",
                        "[&::-moz-range-thumb]:pointer-events-auto",
                        "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
                        "[&::-moz-range-thumb]:rounded-full",
                        "[&::-moz-range-thumb]:bg-primary",
                        "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background",
                        "[&::-moz-range-thumb]:shadow-md",
                        "[&::-moz-range-thumb]:cursor-pointer"
                    )}
                />
                
                {/* Max slider */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={localValue[1]}
                    onChange={handleMaxSlider}
                    className={cn(
                        "absolute w-full h-2 appearance-none bg-transparent pointer-events-none",
                        "[&::-webkit-slider-thumb]:pointer-events-auto",
                        "[&::-webkit-slider-thumb]:appearance-none",
                        "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                        "[&::-webkit-slider-thumb]:rounded-full",
                        "[&::-webkit-slider-thumb]:bg-primary",
                        "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background",
                        "[&::-webkit-slider-thumb]:shadow-md",
                        "[&::-webkit-slider-thumb]:cursor-pointer",
                        "[&::-webkit-slider-thumb]:transition-transform",
                        "[&::-webkit-slider-thumb]:hover:scale-110",
                        "[&::-moz-range-thumb]:pointer-events-auto",
                        "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
                        "[&::-moz-range-thumb]:rounded-full",
                        "[&::-moz-range-thumb]:bg-primary",
                        "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background",
                        "[&::-moz-range-thumb]:shadow-md",
                        "[&::-moz-range-thumb]:cursor-pointer"
                    )}
                />
            </div>
            
            {/* Input fields */}
            {showInputs && (
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <Input
                            type="number"
                            min={min}
                            max={localValue[1]}
                            step={step}
                            value={localValue[0]}
                            onChange={handleMinChange}
                            className="h-8 text-xs text-center"
                        />
                    </div>
                    <span className="text-muted-foreground text-xs">até</span>
                    <div className="flex-1">
                        <Input
                            type="number"
                            min={localValue[0]}
                            max={max}
                            step={step}
                            value={localValue[1]}
                            onChange={handleMaxChange}
                            className="h-8 text-xs text-center"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

