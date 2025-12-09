"use client"

import * as React from "react"
import { ProjectCard } from "./project-card"
import { Project } from "@/types"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"

interface ProjectsGridProps {
    projects: Project[]
    selectedIds: string[]
    onSelect: (project: Project, selected: boolean) => void
    isLoading?: boolean
    className?: string
}

export function ProjectsGrid({
    projects,
    selectedIds,
    onSelect,
    isLoading,
    className,
}: ProjectsGridProps) {
    if (isLoading) {
        return (
            <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", className)}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-[300px] rounded-lg border bg-muted/50 animate-pulse"
                    />
                ))}
            </div>
        )
    }

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium text-foreground">Nenhum projeto encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Tente ajustar os filtros selecionados
                </p>
            </div>
        )
    }

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", className)}>
            {projects.map((project, index) => (
                <ProjectCard
                    key={project.CTT_CUSTO}
                    project={project}
                    isSelected={selectedIds.includes(project.CTT_CUSTO)}
                    onSelect={(selected) => onSelect(project, selected)}
                    style={{
                        animationDelay: `${index * 50}ms`,
                    }}
                    className="animate-in fade-in-0 slide-in-from-bottom-2"
                />
            ))}
        </div>
    )
}


