"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ProjectFilters } from "@/types"

interface SaveFilterModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (name: string) => void
    filters: ProjectFilters
}

export function SaveFilterModal({
    isOpen,
    onClose,
    onSave,
    filters,
}: SaveFilterModalProps) {
    const [name, setName] = React.useState("")
    const [error, setError] = React.useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!name.trim()) {
            setError("O nome do filtro é obrigatório")
            return
        }
        
        onSave(name.trim())
        setName("")
        setError("")
        onClose()
    }

    const handleClose = () => {
        setName("")
        setError("")
        onClose()
    }

    // Contar filtros ativos para preview
    const activeFilters = Object.entries(filters).filter(([key, value]) => {
        if (key === 'startDate' && value === '2023-01-01') return false
        return Boolean(value)
    })

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md" onClose={handleClose}>
                <DialogHeader>
                    <DialogTitle>Salvar Filtro</DialogTitle>
                    <DialogDescription>
                        Salve a combinação atual de filtros para uso futuro.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="filter-name">Nome do filtro</Label>
                        <Input
                            id="filter-name"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setError("")
                            }}
                            placeholder="Ex: Projetos ativos 2024"
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    {/* Preview dos filtros */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Filtros incluídos:</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {activeFilters.length > 0 ? (
                                activeFilters.map(([key, value]) => (
                                    <Badge key={key} variant="secondary" className="text-xs">
                                        {key === 'search' && `Busca: "${value}"`}
                                        {key === 'coordinator' && `Coordenador: ${value}`}
                                        {key === 'client' && `Cliente: ${value}`}
                                        {key === 'startDate' && `Início: ${new Date(String(value)).toLocaleDateString('pt-BR')}`}
                                        {key === 'endDate' && `Fim: ${new Date(String(value)).toLocaleDateString('pt-BR')}`}
                                        {key === 'status' && `Status: ${value}`}
                                        {key === 'showApprovedOnly' && 'Apenas aprovados'}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground">Nenhum filtro ativo</span>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={activeFilters.length === 0}>
                            Salvar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}






