"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
    open: boolean
    setOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined)

function useDropdownMenuContext() {
    const context = React.useContext(DropdownMenuContext)
    if (!context) {
        throw new Error("DropdownMenu components must be used within a DropdownMenu")
    }
    return context
}

interface DropdownMenuProps {
    children: React.ReactNode
}

function DropdownMenu({ children }: DropdownMenuProps) {
    const [open, setOpen] = React.useState(false)
    
    return (
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block text-left">
                {children}
            </div>
        </DropdownMenuContext.Provider>
    )
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
}

function DropdownMenuTrigger({ children, asChild, ...props }: DropdownMenuTriggerProps) {
    const { open, setOpen } = useDropdownMenuContext()
    
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setOpen(!open)
    }

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
            onClick: handleClick,
        })
    }
    
    return (
        <button type="button" onClick={handleClick} {...props}>
            {children}
        </button>
    )
}

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: 'start' | 'center' | 'end'
    side?: 'top' | 'bottom'
}

function DropdownMenuContent({ children, className, align = 'end', side = 'bottom', ...props }: DropdownMenuContentProps) {
    const { open, setOpen } = useDropdownMenuContext()
    const ref = React.useRef<HTMLDivElement>(null)
    
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false)
            }
        }
        
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [open, setOpen])
    
    if (!open) return null
    
    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
                "animate-in fade-in-0 zoom-in-95",
                align === 'start' && 'left-0',
                align === 'center' && 'left-1/2 -translate-x-1/2',
                align === 'end' && 'right-0',
                side === 'bottom' && "top-full mt-1",
                side === 'top' && "bottom-full mb-2",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("px-2 py-1.5 text-sm font-semibold text-foreground", className)}
            {...props}
        />
    )
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("-mx-1 my-1 h-px bg-border", className)}
            {...props}
        />
    )
}

interface DropdownMenuCheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
}

function DropdownMenuCheckboxItem({ 
    children, 
    className, 
    checked, 
    onCheckedChange,
    ...props 
}: DropdownMenuCheckboxItemProps) {
    return (
        <div
            role="menuitemcheckbox"
            aria-checked={checked}
            className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                "transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                className
            )}
            onClick={() => onCheckedChange?.(!checked)}
            {...props}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {checked && <Check className="h-4 w-4" />}
            </span>
            {children}
        </div>
    )
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
    disabled?: boolean
}

function DropdownMenuItem({ className, disabled, onClick, ...props }: DropdownMenuItemProps) {
    const { setOpen } = useDropdownMenuContext()
    
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) {
            e.preventDefault()
            e.stopPropagation()
            return
        }
        if (onClick) {
            onClick(e)
        }
        setOpen(false)
    }
    
    return (
        <div
            role="menuitem"
            className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                "transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                className
            )}
            onClick={handleClick}
            {...props}
        />
    )
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuItem,
}

