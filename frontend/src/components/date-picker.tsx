"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  placeholder?: string
  className?: string
  showClearButton?: boolean
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Selecione uma data",
  className,
  showClearButton = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDate(undefined)
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    setOpen(false) // Fecha o calendário imediatamente após seleção
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              date && showClearButton && "pr-8"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate flex-1">
              {date ? format(date, "PPP", { locale: ptBR }) : <span>{placeholder}</span>}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      {date && showClearButton && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2",
            "h-5 w-5 rounded-sm opacity-70 hover:opacity-100",
            "flex items-center justify-center",
            "hover:bg-accent transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
          aria-label="Limpar data"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
