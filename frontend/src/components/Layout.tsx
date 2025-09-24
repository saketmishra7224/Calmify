import { ReactNode } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
  currentRole?: string;
}

export function Layout({ children, currentRole }: LayoutProps) {
  const { user } = useAuth();
  
  // Use the user's actual role from auth context, fallback to provided currentRole or default to patient
  const actualRole = user?.role || currentRole || "patient";

  return (
    <div className="min-h-screen flex flex-col w-full">
      <AppNavbar currentRole={actualRole} />
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}