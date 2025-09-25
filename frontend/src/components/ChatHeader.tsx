import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  isLoading?: boolean;
  badges?: Array<{
    text: string;
    variant?: "default" | "destructive" | "outline" | "secondary";
  }>;
  actions?: ReactNode;
  className?: string;
}

export function ChatHeader({ 
  title, 
  subtitle, 
  icon, 
  isLoading = false, 
  badges = [], 
  actions, 
  className 
}: ChatHeaderProps) {
  return (
    <div className={cn(
      "bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm border-b border-primary/20 p-4 flex justify-between items-center flex-shrink-0",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {badges.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {badges.map((badge, index) => (
                <Badge key={index} variant={badge.variant || "default"}>
                  {badge.text}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}