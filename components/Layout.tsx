import React, { useState } from 'react';
import { 
  Home, 
  Target, 
  Calendar, 
  Library, 
  Brain, 
  Settings, 
  LogOut, 
  User,
  BarChart3,
  FileText
} from 'lucide-react';
import { Route, User as UserType } from '../App';
import { Avatar } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from './ui/sidebar';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: Route;
  navigate: (route: Route) => void;
  user: UserType | null;
}

export function Layout({ children, currentRoute, navigate, user }: LayoutProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems = [
    { 
      label: 'ダッシュボード', 
      route: '/ipo/dashboard' as Route, 
      icon: Home,
      description: 'キャリア進捗の確認'
    },
    { 
      label: 'AI自己分析', 
      route: '/ipo/analysis' as Route, 
      icon: Brain,
      description: 'AIとの対話で自己理解'
    },
    { 
      label: '選考管理', 
      route: '/ipo/selection' as Route, 
      icon: FileText,
      description: '企業選考の進捗管理'
    },
    { 
      label: 'ケース', 
      route: '/ipo/case' as Route, 
      icon: Target,
      description: '問題解決スキル向上'
    },
    { 
      label: 'カレンダー', 
      route: '/ipo/calendar' as Route, 
      icon: Calendar,
      description: 'スケジュール管理'
    },
    { 
      label: 'ライブラリ', 
      route: '/ipo/library' as Route, 
      icon: Library,
      description: '業界・職種情報'
    },
    { 
      label: '診断', 
      route: '/ipo/diagnosis' as Route, 
      icon: BarChart3,
      description: '性格・適職診断'
    },
  ];

  const handleLogout = () => {
    // Clear user data and navigate to home
    localStorage.removeItem('ipo-user-data');
    navigate('/ipo');
    setIsUserMenuOpen(false);
  };

  const handleSettingsClick = () => {
    navigate('/ipo/settings');
    setIsUserMenuOpen(false);
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div 
            className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
            onClick={() => navigate('/ipo')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">IPO</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground">IPO University</span>
              <span className="text-xs text-sidebar-foreground/70">キャリア開発プラットフォーム</span>
            </div>
            {user && (
              <div className="flex items-center mt-2 space-x-2">
                <Avatar name={user.name} size="xs" />
                <span className="text-xs text-sidebar-foreground/80">{user.name}（自分）</span>
              </div>
            )}
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>メインメニュー</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.route}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.route)}
                      isActive={currentRoute === item.route}
                      tooltip={item.description}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter>
          {user && (
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="relative">
                  <SidebarMenuButton
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="w-full"
                  >
                    <Avatar name={user.name} size="sm" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-sidebar-foreground/70 capitalize">
                        {user.role}アカウント
                      </span>
                    </div>
                  </SidebarMenuButton>

                  {isUserMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-sidebar border border-sidebar-border rounded-lg shadow-lg py-1 z-50">
                        <button 
                          onClick={handleSettingsClick}
                          className="w-full text-left px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center space-x-2 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>設定</span>
                        </button>
                        <div className="h-px bg-sidebar-border my-1" />
                        <button 
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center space-x-2 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>ログアウト</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarFooter>
        
        <SidebarRail />
      </Sidebar>
      
      <SidebarInset>
        {/* Header with sidebar trigger */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-sidebar-border" />
            <div className="flex items-center space-x-2">
              {/* Quick Actions in Header */}
              <button
                onClick={() => navigate('/ipo/analysis')}
                className="inline-flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors text-sm font-medium"
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:block">AI分析</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}