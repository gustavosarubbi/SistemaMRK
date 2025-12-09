import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface TrendIndicatorProps {
    currentValue: number;
    previousValue: number;
    period: string;
    format?: 'currency' | 'percent' | 'number';
    className?: string;
}

export function TrendIndicator({
    currentValue,
    previousValue,
    period,
    format = 'currency',
    className,
}: TrendIndicatorProps) {
    const difference = currentValue - previousValue;
    const percentChange = previousValue !== 0 
        ? ((difference / previousValue) * 100) 
        : 0;
    
    const isPositive = difference > 0;
    const isNeutral = difference === 0;
    
    const formatValue = (value: number) => {
        switch (format) {
            case 'currency':
                return formatCurrency(value);
            case 'percent':
                return `${value.toFixed(1)}%`;
            default:
                return value.toLocaleString('pt-BR');
        }
    };
    
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            {isNeutral ? (
                <Minus className="h-3 w-3 text-muted-foreground" />
            ) : isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={cn(
                "text-xs font-medium",
                isNeutral && "text-muted-foreground",
                isPositive && "text-green-600",
                !isPositive && !isNeutral && "text-red-600"
            )}>
                {isNeutral ? 'Sem variação' : `${isPositive ? '+' : ''}${percentChange.toFixed(1)}%`}
            </span>
            <span className="text-xs text-muted-foreground">
                {period}
            </span>
        </div>
    );
}


