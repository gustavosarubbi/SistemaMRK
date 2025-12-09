"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Minus } from "lucide-react"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, indeterminate, checked, ...props }, ref) => {
        const innerRef = React.useRef<HTMLInputElement>(null);
        
        React.useImperativeHandle(ref, () => innerRef.current!, []);

        React.useEffect(() => {
            if (innerRef.current) {
                innerRef.current.indeterminate = indeterminate ?? false;
            }
        }, [indeterminate]);

        return (
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    ref={innerRef}
                    checked={checked}
                    className="sr-only peer"
                    {...props}
                />
                <div
                    className={cn(
                        "h-4 w-4 shrink-0 rounded-sm border border-primary shadow-sm",
                        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                        "peer-checked:bg-primary peer-checked:text-primary-foreground",
                        "transition-all duration-150",
                        indeterminate && "bg-primary text-primary-foreground",
                        className
                    )}
                >
                    <span className="flex items-center justify-center text-current">
                        {indeterminate ? (
                            <Minus className="h-3 w-3" />
                        ) : checked ? (
                            <Check className="h-3 w-3" />
                        ) : null}
                    </span>
                </div>
            </label>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }


