"use client"

import * as React from "react"
import { CalendarModular, CalendarModularProps } from "./calendar-modular"

/**
 * Props do componente Calendar
 * Compatível com a API do react-day-picker para manter compatibilidade
 */
export interface CalendarProps {
  /** Data selecionada */
  selected?: Date
  /** Range de datas selecionado */
  selectedRange?: { from?: Date; to?: Date }
  /** Callback quando uma data é selecionada */
  onSelect?: (date: Date | undefined) => void
  /** Callback quando um range é selecionado */
  onSelectRange?: (range: { from?: Date; to?: Date }) => void
  /** Modo de seleção */
  mode?: "single" | "range"
  /** Data inicial para exibição (aceita Date ou boolean para compatibilidade) */
  initialFocus?: Date | boolean
  /** Datas desabilitadas */
  disabled?: (date: Date) => boolean
  /** Classes customizadas */
  className?: string
  /** Mostrar dias de outros meses */
  showOutsideDays?: boolean
  /** Número de meses a exibir */
  numberOfMonths?: number
  /** Locale (mantido para compatibilidade, mas não usado - sempre ptBR) */
  locale?: any
}

/**
 * Componente Calendar - Wrapper do CalendarModular
 * 
 * Este componente mantém compatibilidade com a API do react-day-picker
 * mas usa internamente o novo calendário customizado construído do zero.
 */
function Calendar({
  selected,
  onSelect,
  mode = "single",
  initialFocus,
  disabled,
  className,
  showOutsideDays = true,
  numberOfMonths = 1,
  locale,
  ...props
}: CalendarProps) {
  // Converte initialFocus boolean para Date se necessário (compatibilidade)
  const focusDate = React.useMemo(() => {
    if (initialFocus === true) {
      return new Date()
    }
    if (initialFocus === false || initialFocus === undefined) {
      return undefined
    }
    return initialFocus
  }, [initialFocus])

  return (
    <CalendarModular
      selected={selected}
      onSelect={onSelect}
      mode={mode}
      initialFocus={focusDate}
      disabled={disabled}
      className={className}
      showOutsideDays={showOutsideDays}
      numberOfMonths={numberOfMonths}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
