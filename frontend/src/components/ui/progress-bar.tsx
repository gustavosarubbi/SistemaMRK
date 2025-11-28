import { cn } from "@/lib/utils";

interface ProgressBarProps {
    value: number;
    className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
    // Clamp value between 0 and 100 for width, but keep original for color logic if needed
    const percentage = Math.min(Math.max(value, 0), 100);
    
    // Cores profissionais com melhor contraste
    let colorClass = "bg-green-600 dark:bg-green-500";
    if (value > 100) {
        colorClass = "bg-red-600 dark:bg-red-500"; // Excedido
    } else if (value > 85) {
        colorClass = "bg-orange-600 dark:bg-orange-500"; // Crítico
    } else if (value > 70) {
        colorClass = "bg-yellow-600 dark:bg-yellow-500"; // Atenção
    }
    
    return (
        <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner", className)}>
            <div
                className={cn("h-full transition-all duration-500 ease-out", colorClass)}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}


