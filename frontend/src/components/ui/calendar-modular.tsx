"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Modo de seleção do calendário
 */
export type CalendarMode = "single" | "range"

/**
 * Props do componente CalendarModular
 */
export interface CalendarModularProps {
  /** Data selecionada (modo single) */
  selected?: Date
  /** Range de datas selecionado (modo range) */
  selectedRange?: { from?: Date; to?: Date }
  /** Callback quando uma data é selecionada */
  onSelect?: (date: Date | undefined) => void
  /** Callback quando um range é selecionado (modo range) */
  onSelectRange?: (range: { from?: Date; to?: Date }) => void
  /** Modo de seleção */
  mode?: CalendarMode
  /** Data inicial para exibição */
  initialFocus?: Date
  /** Datas desabilitadas */
  disabled?: (date: Date) => boolean
  /** Classes customizadas */
  className?: string
  /** Mostrar dias de outros meses */
  showOutsideDays?: boolean
  /** Número de meses a exibir */
  numberOfMonths?: number
}

/**
 * Nomes dos meses em português
 */
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]

/**
 * Nomes dos dias da semana em português (abreviados)
 */
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]

/**
 * Nomes completos dos dias da semana
 */
const WEEKDAYS_FULL = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"
]

/**
 * Funções auxiliares para manipulação de datas
 */
const dateUtils = {
  /**
   * Obtém o primeiro dia do mês
   */
  getFirstDayOfMonth: (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  },

  /**
   * Obtém o último dia do mês
   */
  getLastDayOfMonth: (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
  },

  /**
   * Obtém o primeiro dia da semana do mês (domingo = 0)
   */
  getFirstDayOfWeek: (date: Date): number => {
    const firstDay = dateUtils.getFirstDayOfMonth(date)
    return firstDay.getDay()
  },

  /**
   * Verifica se duas datas são do mesmo dia
   */
  isSameDay: (date1: Date | undefined, date2: Date | undefined): boolean => {
    if (!date1 || !date2) return false
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  },

  /**
   * Verifica se uma data é hoje
   */
  isToday: (date: Date): boolean => {
    const today = new Date()
    return dateUtils.isSameDay(date, today)
  },

  /**
   * Verifica se uma data está no mês atual
   */
  isCurrentMonth: (date: Date, currentMonth: Date): boolean => {
    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    )
  },

  /**
   * Adiciona meses a uma data
   */
  addMonths: (date: Date, months: number): Date => {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  },

  /**
   * Adiciona dias a uma data
   */
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },

  /**
   * Verifica se uma data está em um range
   */
  isInRange: (date: Date, from?: Date, to?: Date): boolean => {
    if (!from && !to) return false
    if (from && to) {
      return date >= from && date <= to
    }
    if (from) {
      return date >= from
    }
    if (to) {
      return date <= to
    }
    return false
  },

  /**
   * Verifica se uma data é o início do range
   */
  isRangeStart: (date: Date, from?: Date): boolean => {
    if (!from) return false
    return dateUtils.isSameDay(date, from)
  },

  /**
   * Verifica se uma data é o fim do range
   */
  isRangeEnd: (date: Date, to?: Date): boolean => {
    if (!to) return false
    return dateUtils.isSameDay(date, to)
  },

  /**
   * Cria uma data com hora zerada para comparação
   */
  normalizeDate: (date: Date): Date => {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    normalized.setMilliseconds(0)
    return normalized
  },
}

/**
 * Componente de calendário modular e reutilizável
 * 
 * Calendário totalmente customizado, construído do zero sem dependências externas.
 * Suporta seleção única e range de datas.
 */
function CalendarModular({
  selected,
  selectedRange,
  onSelect,
  onSelectRange,
  mode = "single",
  initialFocus,
  disabled,
  className,
  showOutsideDays = true,
  numberOfMonths = 1,
}: CalendarModularProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    return initialFocus
      ? new Date(initialFocus.getFullYear(), initialFocus.getMonth(), 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })

  const [rangeStart, setRangeStart] = React.useState<Date | undefined>(
    selectedRange?.from
  )

  // Sincroniza rangeStart com selectedRange quando muda externamente
  React.useEffect(() => {
    if (mode === "range" && selectedRange) {
      if (!selectedRange.from && !selectedRange.to) {
        setRangeStart(undefined)
      } else if (selectedRange.from && !selectedRange.to) {
        setRangeStart(selectedRange.from)
      } else if (selectedRange.from && selectedRange.to) {
        setRangeStart(undefined)
      }
    }
  }, [mode, selectedRange])

  /**
   * Gera os dias do calendário para o mês atual
   */
  const generateCalendarDays = React.useCallback((month: Date): Date[] => {
    const firstDay = dateUtils.getFirstDayOfMonth(month)
    const lastDay = dateUtils.getLastDayOfMonth(month)
    const firstDayOfWeek = dateUtils.getFirstDayOfWeek(month)
    
    const days: Date[] = []
    
    // Adiciona dias do mês anterior (se necessário)
    if (showOutsideDays && firstDayOfWeek > 0) {
      const prevMonth = dateUtils.addMonths(month, -1)
      const prevMonthLastDay = dateUtils.getLastDayOfMonth(prevMonth)
      const daysToAdd = firstDayOfWeek
      
      for (let i = daysToAdd - 1; i >= 0; i--) {
        days.push(
          new Date(
            prevMonth.getFullYear(),
            prevMonth.getMonth(),
            prevMonthLastDay.getDate() - i
          )
        )
      }
    }
    
    // Adiciona todos os dias do mês atual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(month.getFullYear(), month.getMonth(), day))
    }
    
    // Adiciona dias do próximo mês para completar a grade (se necessário)
    if (showOutsideDays) {
      const totalCells = Math.ceil(days.length / 7) * 7
      const remainingDays = totalCells - days.length
      
      for (let day = 1; day <= remainingDays; day++) {
        days.push(
          new Date(month.getFullYear(), month.getMonth() + 1, day)
        )
      }
    }
    
    return days
  }, [showOutsideDays])

  const calendarDays = React.useMemo(
    () => generateCalendarDays(currentMonth),
    [currentMonth, generateCalendarDays]
  )


  /**
   * Altera o mês selecionado
   */
  const handleMonthChange = React.useCallback((monthIndex: string) => {
    const newMonth = parseInt(monthIndex, 10)
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(newMonth)
      return newDate
    })
  }, [])

  /**
   * Altera o ano selecionado
   */
  const handleYearChange = React.useCallback((year: string) => {
    const newYear = parseInt(year, 10)
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      newDate.setFullYear(newYear)
      return newDate
    })
  }, [])

  /**
   * Gera lista de anos (100 anos para trás e 10 anos para frente)
   */
  const availableYears = React.useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let i = currentYear - 100; i <= currentYear + 10; i++) {
      years.push(i)
    }
    return years.reverse() // Mais recentes primeiro
  }, [])

  /**
   * Manipula o clique em um dia
   */
  const handleDayClick = React.useCallback(
    (date: Date) => {
      if (disabled && disabled(date)) {
        return
      }

      // Cria uma nova data com apenas dia, mês e ano (sem hora)
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

      if (mode === "single") {
        if (onSelect) {
          // Sempre seleciona a data clicada (não deseleciona se já estiver selecionada)
          // Isso permite que o usuário veja a seleção visualmente antes de confirmar
          onSelect(normalizedDate)
        }
      } else if (mode === "range") {
        if (onSelectRange) {
          const currentRangeStart = rangeStart || selectedRange?.from
          
          if (!currentRangeStart) {
            // Inicia o range
            setRangeStart(normalizedDate)
            onSelectRange({ from: normalizedDate, to: undefined })
          } else {
            // Completa o range
            if (normalizedDate < currentRangeStart) {
              // Se a data selecionada é anterior ao início, inverte
              setRangeStart(normalizedDate)
              onSelectRange({ from: normalizedDate, to: currentRangeStart })
            } else {
              // Completa o range normalmente
              setRangeStart(undefined)
              onSelectRange({ from: currentRangeStart, to: normalizedDate })
            }
          }
        }
      }
    },
    [mode, onSelect, onSelectRange, selectedRange, rangeStart, disabled]
  )

  /**
   * Obtém as classes CSS para um dia
   */
  const getDayClasses = React.useCallback(
    (date: Date): string => {
      const isCurrentMonthDay = dateUtils.isCurrentMonth(date, currentMonth)
      const isToday = dateUtils.isToday(date)
      // Compara diretamente sem normalizar para evitar problemas de timezone
      const isSelected =
        mode === "single"
          ? selected && dateUtils.isSameDay(date, selected)
          : false
      const isRangeStart =
        mode === "range" &&
        selectedRange?.from &&
        dateUtils.isRangeStart(date, selectedRange.from)
      const isRangeEnd =
        mode === "range" &&
        selectedRange?.to &&
        dateUtils.isRangeEnd(date, selectedRange.to)
      const isInRange =
        mode === "range" &&
        dateUtils.isInRange(
          date,
          selectedRange?.from,
          selectedRange?.to
        ) &&
        !isRangeStart &&
        !isRangeEnd
      const isDisabled = disabled && disabled(date)

      return cn(
        buttonVariants({ variant: "ghost" }),
        "h-9 w-9 p-0 font-normal",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground",
        "transition-colors",
        !isCurrentMonthDay && showOutsideDays && "text-muted-foreground opacity-50",
        isToday && "bg-accent text-accent-foreground font-semibold",
        isSelected &&
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        isRangeStart &&
          "bg-primary text-primary-foreground rounded-l-md",
        isRangeEnd &&
          "bg-primary text-primary-foreground rounded-r-md",
        isInRange &&
          "bg-accent text-accent-foreground rounded-none",
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )
    },
    [
      currentMonth,
      mode,
      selected,
      selectedRange,
      showOutsideDays,
      disabled,
    ]
  )

  return (
    <div className={cn("p-3", className)}>
      <div className="space-y-4">
        {/* Header do calendário */}
        <div className="flex justify-center pt-1 items-center gap-2">
          {/* Seletor de mês */}
          <Select
            value={currentMonth.getMonth().toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger 
              className="h-8 w-[140px] text-sm font-medium capitalize border-none shadow-none hover:bg-accent/50 focus:ring-0 focus-visible:ring-0 bg-transparent px-2"
              size="sm"
            >
              <SelectValue>
                {MONTHS[currentMonth.getMonth()]}
              </SelectValue>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem
                  key={index}
                  value={index.toString()}
                  className="capitalize"
                >
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Seletor de ano */}
          <Select
            value={currentMonth.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger 
              className="h-8 w-[90px] text-sm font-medium border-none shadow-none hover:bg-accent/50 focus:ring-0 focus-visible:ring-0 bg-transparent px-2"
              size="sm"
            >
              <SelectValue>
                {currentMonth.getFullYear()}
              </SelectValue>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grade do calendário */}
        <div className="w-full border-collapse space-y-1">
          {/* Cabeçalho dos dias da semana */}
          <div className="flex">
            {WEEKDAYS.map((day, index) => (
              <div
                key={index}
                className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dias do calendário */}
          <div className="flex flex-col space-y-1">
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map(
              (_, weekIndex) => (
                <div key={weekIndex} className="flex w-full mt-2">
                  {calendarDays
                    .slice(weekIndex * 7, (weekIndex + 1) * 7)
                    .map((date, dayIndex) => {
                      const globalIndex = weekIndex * 7 + dayIndex
                      const isCurrentMonthDay = dateUtils.isCurrentMonth(
                        date,
                        currentMonth
                      )
                      const isRangeStart =
                        mode === "range" &&
                        selectedRange?.from &&
                        dateUtils.isRangeStart(date, selectedRange.from)
                      const isRangeEnd =
                        mode === "range" &&
                        selectedRange?.to &&
                        dateUtils.isRangeEnd(date, selectedRange.to)
                      const isInRange =
                        mode === "range" &&
                        dateUtils.isInRange(
                          date,
                          selectedRange?.from,
                          selectedRange?.to
                        ) &&
                        !isRangeStart &&
                        !isRangeEnd

                      return (
                        <div
                          key={globalIndex}
                          className={cn(
                            "h-9 w-9 text-center text-sm p-0 relative",
                            "focus-within:relative focus-within:z-20",
                            isRangeStart && "first:rounded-l-md",
                            isRangeEnd && "last:rounded-r-md",
                            isInRange && "rounded-none"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleDayClick(date)}
                            className={getDayClasses(date)}
                            disabled={disabled && disabled(date)}
                            aria-label={`${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`}
                            aria-selected={
                              (mode === "single" &&
                                selected &&
                                dateUtils.isSameDay(date, selected)) ||
                              (mode === "range" &&
                                (isRangeStart || isRangeEnd || isInRange))
                            }
                          >
                            {date.getDate()}
                          </button>
                        </div>
                      )
                    })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

CalendarModular.displayName = "CalendarModular"

export { CalendarModular }
export type { CalendarModularProps, CalendarMode }
