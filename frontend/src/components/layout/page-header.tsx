'use client';

import Link from 'next/link';
import { LayoutDashboard, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description: string;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  breadcrumbItems = [],
  className 
}: PageHeaderProps) {
  const defaultBreadcrumb = [
    { label: 'Dashboard', href: '/dashboard' },
    ...breadcrumbItems
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
        {defaultBreadcrumb.slice(1).map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {item.href ? (
              <Link 
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Title and Description */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}










