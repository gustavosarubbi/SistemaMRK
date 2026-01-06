import { Progress } from "@/components/ui/progress";

interface LoadingProgressProps {
    progress: number;
    message?: string;
}

export function LoadingProgress({ progress, message = "Carregando dados..." }: LoadingProgressProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-sm font-medium text-muted-foreground">
                    <span>{message}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 w-full transition-all duration-500 ease-out" />
            </div>
            <p className="text-xs text-muted-foreground animate-pulse">
                Otimizando sua experiência...
            </p>
        </div>
    );
}
