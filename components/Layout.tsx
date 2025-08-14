import React, { useEffect, useState } from 'react';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: Route;
  navigate: (route: Route) => void;
  user: UserType | null;
}

export function Layout({ children, currentRoute, navigate, user }: LayoutProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { setOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)'); // tailwind sm breakpoint
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      // @ts-ignore - unify event/list
      const matches = 'matches' in e ? e.matches : e.currentTarget?.matches ?? mq.matches;
      setIsMobile(!!matches);
    };
    // initial
    setIsMobile(mq.matches);
    // subscribe
    mq.addEventListener?.('change', handler as EventListener);
    // fallback for older Safari
    // @ts-ignore
    mq.addListener?.(handler);
    return () => {
      mq.removeEventListener?.('change', handler as EventListener);
      // @ts-ignore
      mq.removeListener?.(handler);
    };
  }, []);

  const handleNavigate = (route: Route) => {
    navigate(route);
    // Auto close the sidebar on mobile after navigating to a different item
    if (isMobile) setOpen(false);
  };

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
    if (isMobile) setOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleSettingsClick = () => {
    navigate('/ipo/settings');
    if (isMobile) setOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <Sidebar
        variant="inset"
        className="!bg-white dark:!bg-neutral-900 supports-[backdrop-filter]:!bg-white backdrop-blur-0 border-r border-neutral-200 dark:border-neutral-800 shadow-sm"
      >
        <SidebarHeader className="bg-white dark:bg-neutral-900">
          <div 
            className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
            onClick={() => handleNavigate('/ipo' as Route)}
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
                <Avatar className="h-5 w-5">
                  <AvatarImage src={(user as any)?.avatarUrl ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-[10px]">
                    {(user.name || '').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-sidebar-foreground/80">{user.name}（自分）</span>
              </div>
            )}
          </div>
        </SidebarHeader>
        
        <SidebarContent className="bg-white dark:bg-neutral-900">
          <SidebarGroup>
            <SidebarGroupLabel>メインメニュー</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.route}>
                    <SidebarMenuButton
                      onClick={() => {
                        if (currentRoute !== item.route) {
                          handleNavigate(item.route);
                        } else if (isMobile) {
                          // If tapping the same route on mobile, just close
                          setOpen(false);
                        }
                      }}
                      isActive={currentRoute === item.route}
                      tooltip={item.description}
                      className={`${currentRoute === item.route ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'} justify-start`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="bg-white dark:bg-neutral-900">
          {user && (
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="relative">
                  <SidebarMenuButton
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="w-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(user as any)?.avatarUrl ?? undefined} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {(user.name || '').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-neutral-900 border border-sidebar-border rounded-lg shadow-lg py-1 z-50">
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
        
        <SidebarRail className="hidden sm:flex" />
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
    </>
  );
}