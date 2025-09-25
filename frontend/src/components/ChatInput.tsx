import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  helpText?: string;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  placeholder = "Type a message...",
  disabled = false,
  isLoading = false,
  helpText,
  className
}: ChatInputProps) {
  return (
    <div className={cn(
      "bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm border-t border-primary/20 p-4",
      className
    )}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyPress={onKeyPress}
          disabled={disabled || isLoading}
          className="flex-1 bg-white/80 backdrop-blur-sm border-primary/20 focus:border-primary focus:ring-primary/20"
        />
        <Button 
          onClick={onSend} 
          disabled={!value.trim() || disabled || isLoading}
          size="icon"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground mt-2">{helpText}</p>
      )}
    </div>
  );
}