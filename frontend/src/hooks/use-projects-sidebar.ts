"use client"

import { useState, useCallback } from "react";

export type SidebarProjectType = "in_execution" | "ending_soon";

interface UseProjectsSidebarReturn {
    isOpen: boolean;
    projectType: SidebarProjectType | null;
    openSidebar: (type: SidebarProjectType) => void;
    closeSidebar: () => void;
    toggleSidebar: (type?: SidebarProjectType) => void;
}

export function useProjectsSidebar(): UseProjectsSidebarReturn {
    const [isOpen, setIsOpen] = useState(false);
    const [projectType, setProjectType] = useState<SidebarProjectType | null>(null);
    
    const openSidebar = useCallback((type: SidebarProjectType) => {
        setProjectType(type);
        setIsOpen(true);
    }, []);
    
    const closeSidebar = useCallback(() => {
        setIsOpen(false);
        // Don't clear projectType immediately to avoid flicker
        setTimeout(() => setProjectType(null), 300);
    }, []);
    
    const toggleSidebar = useCallback((type?: SidebarProjectType) => {
        if (type) {
            if (isOpen && projectType === type) {
                closeSidebar();
            } else {
                openSidebar(type);
            }
        } else {
            setIsOpen(prev => !prev);
        }
    }, [isOpen, projectType, openSidebar, closeSidebar]);
    
    return {
        isOpen,
        projectType,
        openSidebar,
        closeSidebar,
        toggleSidebar,
    };
}

