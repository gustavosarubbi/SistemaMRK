import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendPeriod } from '@/types';

interface TrendPeriodSelectorProps {
    value: TrendPeriod;
    onChange: (period: TrendPeriod) => void;
    className?: string;
}

export function TrendPeriodSelector({ value, onChange, className }: TrendPeriodSelectorProps) {
    const handleChange = (type: string) => {
        if (type === 'custom') {
            onChange({ type: 'custom', start_date: '', end_date: '' });
        } else {
            onChange({ type: type as TrendPeriod['type'] });
        }
    };

    return (
        <Select value={value.type} onValueChange={handleChange}>
            <SelectTrigger className={className}>
                <SelectValue placeholder="Período de comparação" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="last_month">Mês anterior</SelectItem>
                <SelectItem value="last_quarter">Trimestre anterior</SelectItem>
                <SelectItem value="year_ago">Mesmo período ano passado</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
        </Select>
    );
}







