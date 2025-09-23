import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  ChevronRight,
  Heart,
  LogOut,
  User,
  Shield,
  Clock,
  HelpCircle,
  FileText,
  Brain
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  currentRole: string;
}

const roleConfigs = {
  patient: {
    title: "Patient",
    icon: User,
    items: [
      { title: "My Sessions", url: "/my-sessions", icon: Clock },
      { title: "AI Chatbot", url: "/chatbot", icon: MessageCircle },
      { title: "Peer Support", url: "/peer/request", icon: Users },
      { title: "Counselor Sessions", url: "/counselor/request", icon: UserCheck },
      { title: "Take Assessment", url: "/assessment", icon: FileText },
      { title: "Meditation", url: "/meditation", icon: Brain },
      { title: "Crisis Help", url: "/crisis", icon: AlertTriangle },
    ]
  },
  student: {
    title: "Student",
    icon: Users,
    items: [
      { title: "My Sessions", url: "/my-sessions", icon: Clock },
      { title: "AI Chatbot", url: "/chatbot", icon: MessageCircle },
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
      { title: "Available Sessions", url: "/peer/available", icon: MessageCircle },
      { title: "My Sessions", url: "/my-sessions", icon: Clock },
      { title: "Session History", url: "/peer/history", icon: Archive },
      { title: "Resources", url: "/peer/resources", icon: BookOpen },
      { title: "Training", url: "/peer/training", icon: Star },
    ]
  },
  counselor: {
    title: "Counselor",
    icon: Heart,
    items: [
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
      { title: "Dashboard", url: "/admin/analytics", icon: BarChart3 },
      { title: "User Management", url: "/admin/users", icon: Users },
      { title: "System Stats", url: "/admin/stats", icon: TrendingUp },
      { title: "Content Moderation", url: "/admin/moderation", icon: Shield },
      { title: "Crisis Management", url: "/admin/crisis", icon: AlertTriangle },
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ]
  }
};

export function AppSidebar({ currentRole }: AppSidebarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const roleConfig = roleConfigs[currentRole as keyof typeof roleConfigs] || roleConfigs.patient;
  const IconComponent = roleConfig.icon;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Sidebar className="w-64 bg-background border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">{roleConfig.title}</h2>
            {user && (
              <p className="text-xs text-muted-foreground">
                {user.profile?.preferredName || user.profile?.firstName || user.username}
              </p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {roleConfig.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          }`
                        }
                      >
                        <ItemIcon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/crisis"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 text-destructive hover:bg-destructive/10"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Emergency Help</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a
                    href="tel:988"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>Crisis Line: 988</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-200">
        {isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Session active</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {user?.isAnonymous ? "End Session" : "Logout"}
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Button
              size="sm"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Login
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
