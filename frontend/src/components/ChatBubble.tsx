import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  sender: "user" | "assistant" | "urgent";
  timestamp?: string;
  className?: string;
}

export function ChatBubble({ message, sender, timestamp, className }: ChatBubbleProps) {
  const isUser = sender === "user";
  const isUrgent = sender === "urgent";

  return (
    <div className={cn("flex mb-4", isUser ? "justify-end" : "justify-start", className)}>
      <div
        className={cn(
          "max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm",
          isUrgent
            ? "bg-destructive text-destructive-foreground"
            : isUser
            ? "bg-primary text-primary-foreground"
            : "bg-white border border-primary/10 text-foreground"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message}</p>
        {timestamp && (
          <p className={cn(
            "text-xs mt-1 opacity-70",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>{timestamp}</p>
        )}
      </div>
    </div>
  );
}