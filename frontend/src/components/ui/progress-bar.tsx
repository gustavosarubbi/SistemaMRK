import { cn } from "@/lib/utils";

interface ProgressBarProps {
    value: number;
    className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
    // Clamp value between 0 and 100 for width, but keep original for color logic if needed
    const percentage = Math.min(Math.max(value, 0), 100);
    
    let colorClass = "bg-green-500";
    if (value > 100) colorClass = "bg-red-600"; // Over budget
    else if (value > 85) colorClass = "bg-red-500"; // Critical
    else if (value > 70) colorClass = "bg-yellow-500"; // Warning
    
    return (
        <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
            <div
                className={cn("h-full flex-1 transition-all", colorClass)}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

