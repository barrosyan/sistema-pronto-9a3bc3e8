import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface NavLinkProps {
  to: string;
  children: ReactNode;
  icon?: ReactNode;
  subtitle?: string;
}

export const NavLink = ({ to, children, icon, subtitle }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      {icon}
      <div className="flex flex-col">
        <span>{children}</span>
        {subtitle && (
          <span className="text-xs font-normal opacity-70">
            {subtitle}
          </span>
        )}
      </div>
    </Link>
  );
};
