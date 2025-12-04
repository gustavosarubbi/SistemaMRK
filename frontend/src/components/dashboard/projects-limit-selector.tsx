"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface ProjectsLimitSelectorProps {
    onLimitChange?: (limit: number) => void;
    className?: string;
}

const LIMIT_OPTIONS = [
    { value: 5, label: "Top 5" },
    { value: 10, label: "Top 10" },
    { value: 20, label: "Top 20" },
    { value: -1, label: "Todos" },
];

export function ProjectsLimitSelector({ 
    onLimitChange,
    className 
}: ProjectsLimitSelectorProps) {
    const [limit, setLimit] = useLocalStorage<number>("dashboard-projects-limit", 5);
    
    const handleChange = (value: string) => {
        const newLimit = parseInt(value);
        setLimit(newLimit);
        if (onLimitChange) {
            onLimitChange(newLimit === -1 ? Infinity : newLimit);
        }
    };
    
    // Use the limit value, defaulting to 5 if not yet hydrated
    const displayLimit = limit ?? 5;
    
    return (
        <Select 
            value={displayLimit.toString()} 
            onValueChange={handleChange}
        >
            <SelectTrigger className={className || "w-[120px]"}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {LIMIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

