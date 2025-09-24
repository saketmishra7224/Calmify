import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  Home, 
  MessageCircle, 
  Users, 
  Archive, 
  BookOpen, 
  Star, 
  Settings,
  BarChart3,
  UserCheck,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Heart,
  LogOut,
  User,
  Shield,
  Clock,
  FileText,
  Brain,
  Menu
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AppNavbarProps {
  currentRole: string;
}

const roleConfigs = {
  patient: {
    title: "Patient",
    icon: User,
    items: [
      { title: "AI Chatbot", url: "/chatbot", icon: MessageCircle },
      { title: "My Sessions", url: "/my-sessions", icon: Clock },
      { title: "Peer Support", url: "/peer/request", icon: Users },
      { title: "Counselor Sessions", url: "/counselor/request", icon: UserCheck },
      { title: "Take Assessment", url: "/assessment", icon: FileText },
      { title: "Meditation", url: "/meditation", icon: Brain },
      { title: "Crisis Help", url: "/crisis", icon: AlertTriangle },
    ]
  },
  peer: {
    title: "Peer Volunteer",
    icon: UserCheck,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "Available Sessions", url: "/peer/available", icon: MessageCircle },
      { title: "My Sessions", url: "/my-sessions", icon: Clock },
      { title: "Session History", url: "/session-history", icon: Archive },
      { title: "Resources", url: "/peer/resources", icon: BookOpen },
      { title: "Training", url: "/peer/training", icon: Star },
      { title: "Crisis Help", url: "/crisis", icon: AlertTriangle },
    ]
  },
  counselor: {
    title: "Counselor",
    icon: Heart,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "Available Sessions", url: "/counselor/available", icon: MessageCircle },
      { title: "My Sessions", url: "/my-sessions", icon: Clock },
      { title: "Patient Reports", url: "/counselor/reports", icon: Archive },
      { title: "Crisis Alerts", url: "/counselor/alerts", icon: AlertTriangle },
      { title: "Schedule", url: "/counselor/calendar", icon: Calendar },
      { title: "Notes & Records", url: "/counselor/notes", icon: FileText },
    ]
  },
  admin: {
    title: "Administrator",
    icon: Settings,
    items: [
      { title: "Analytics Dashboard", url: "/admin/analytics", icon: BarChart3 },
      { title: "User Management", url: "/admin/users", icon: Users },
      { title: "System Stats", url: "/admin/stats", icon: TrendingUp },
      { title: "Content Moderation", url: "/admin/moderation", icon: Shield },
      { title: "Crisis Management", url: "/admin/crisis", icon: AlertTriangle },
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ]
  }
};

export function AppNavbar({ currentRole }: AppNavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleConfig = roleConfigs[currentRole as keyof typeof roleConfigs] || roleConfigs.patient;
  const IconComponent = roleConfig.icon;

  // Find current page title
  const getCurrentPageTitle = () => {
    const currentPath = location.pathname;
    for (const item of roleConfig.items) {
      if (item.url === currentPath) {
        return item.title;
      }
    }
    if (currentPath === '/crisis') return 'Emergency Help';
    if (currentPath === '/') return 'Home';
    return roleConfig.title;
  };

  const getRoleDisplayName = () => {
    if (!isAuthenticated || !user) return 'SANEYAR';
    
    switch (user.role) {
      case 'patient':
        return 'PATIENT';
      case 'peer':
        return 'PEER';
      case 'counselor':
        return 'COUNSELOR';
      case 'admin':
        return 'ADMIN';
      default:
        return 'SANEYAR';
    }
  };

  const handleHomeClick = () => {
    if (!isAuthenticated || !user) {
      navigate('/');
      return;
    }

    // Route authenticated users based on their role
    switch (user.role) {
      case 'patient':
        navigate('/chatbot');
        break;
      case 'peer':
      case 'counselor':
        navigate('/dashboard');
        break;
      case 'admin':
        navigate('/admin/analytics');
        break;
      default:
        navigate('/');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-background border-b border-border px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        {/* Left side - Logo/Brand */}
        <button
          onClick={handleHomeClick}
          className="flex items-center gap-2 sm:gap-3 hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors duration-200 group"
          title="Click to go to home page"
        >
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors duration-200">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 hidden sm:block">
            <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 text-sm">
              {getRoleDisplayName()}
            </h2>
            {user && (
              <p className="text-xs text-muted-foreground group-hover:text-primary/80 transition-colors duration-200">
                {user.profile?.preferredName || user.profile?.firstName || user.username}
              </p>
            )}
          </div>
          <div className="flex-1 sm:hidden">
            <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 text-sm">
              {getRoleDisplayName()}
            </h2>
          </div>
        </button>

        {/* Center - Quick Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/crisis')}
            className="text-destructive hover:bg-destructive/10"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency Help
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href="tel:988" className="flex items-center">
              <AlertTriangle className="h-3 w-3 mr-2" />
              Crisis Line: 988
            </a>
          </Button>
        </div>

        {/* Right side - Menu Dropdown and Session Status */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Session active</span>
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Menu className="h-5 w-5" />
                {isAuthenticated && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-2 w-2 p-0">
                    <span className="sr-only">Active session</span>
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-56 mt-1">
              <DropdownMenuLabel>Navigation</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Navigation Items */}
              {roleConfig.items.map((item, index) => {
                const ItemIcon = item.icon;
                return (
                  <DropdownMenuItem key={`${item.url}-${item.title}-${index}`} asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 w-full"
                    >
                      <ItemIcon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </DropdownMenuItem>
                );
              })}
              
              <DropdownMenuSeparator />
              
              {/* Quick Actions for Mobile */}
              <div className="md:hidden">
                <DropdownMenuItem asChild>
                  <NavLink to="/crisis" className="flex items-center gap-3 w-full text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Emergency Help</span>
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="tel:988" className="flex items-center gap-3 w-full">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Crisis Line: 988</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
              
              {/* Home Link */}
              <DropdownMenuItem asChild>
                <NavLink to="/" className="flex items-center gap-3 w-full">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </NavLink>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Auth Actions */}
              {isAuthenticated ? (
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-3" />
                  {user?.isAnonymous ? "End Session" : "Logout"}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => navigate('/login')}>
                  <User className="h-4 w-4 mr-3" />
                  Login
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}