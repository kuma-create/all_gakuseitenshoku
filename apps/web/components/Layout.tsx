import React, { useEffect, useState } from 'react';
import { 
  BarChart3,
  Bell,
  Brain, 
  Calendar, 
  FileText,
  Home, 
  Library, 
  LogOut, 
  MessageCircle,
  Pen,
  Search,
  Send,
  Settings, 
  Sparkles,
  Target, 
  User,
  Briefcase,
  Key,
} from 'lucide-react';

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

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';


export { Sidebar } from './ui/sidebar';

// Local type definitions to remove dependency on ../App
type Route =
  | '/ipo'
  | '/ipo/login'
  | '/ipo/dashboard'
  | '/ipo/analysis'
  | '/ipo/selection'
  | '/ipo/case'
  | '/ipo/calendar'
  | '/ipo/library'
  | '/ipo/diagnosis'
  | '/ipo/settings'
  | '/ipo/ES'
  | '/student/scouts'
  | '/chat'
  | '/jobs'
  | '/madia'
  | '/features'
  | '/student/applications';

type UserType = {
  id?: string;
  name: string;
  role: string; // e.g. 'student' | 'admin'
  avatarUrl?: string | null;
};

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: Route;
  navigate: (route: Route) => void;
  user: UserType | null;
}

export function Layout({ children, currentRoute, navigate, user }: LayoutProps) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  // Header helpers to align with app-wide session UI
  const ready = true;
  const isLoggedIn = !!user;
  const avatar = user?.avatarUrl ?? null;
  const session = isLoggedIn ? { user: { id: (user as any)?.id ?? '' } } : null;

  // Collapse sidebar to icon-only on first mount (desktop only)
  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
    // We intentionally run this only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigate = (route: Route) => {
    navigate(route);
    // Auto close the sidebar only on mobile after navigating
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  type NavItem = { label: string; route: Route; icon: React.ComponentType<any>; description: string };

  const navItems: NavItem[] = [
    { 
      label: 'ホーム', 
      route: '/ipo/dashboard' as Route, 
      icon: Home,
      description: 'ホーム'
    },
    { 
      label: '選考管理', 
      route: '/ipo/selection' as Route, 
      icon: FileText,
      description: '選考管理'
    },
    {
      label: 'ES管理',
      route: '/ipo/ES' as Route,
      icon: Pen,
      description: 'ES管理'
    },
    { 
      label: '自己分析', 
      route: '/ipo/analysis' as Route, 
      icon: Brain,
      description: '自己分析'
    },    
    { 
      label: '求人検索', 
      route: '/jobs' as Route, 
      icon: Search,
      description: '求人検索'
    },
    { 
      label: 'ヘッドハンティング', 
      route: '/student/scouts' as Route, 
      icon: Send,
      description: 'ヘッドハンティング'
    },
    { 
      label: '応募履歴', 
      route: '/student/applications' as Route, 
      icon: Briefcase,
      description: '応募履歴'
    },
    { 
      label: 'チャット', 
      route: '/chat' as Route, 
      icon: MessageCircle,
      description: 'チャット'
    },
    { 
      label: 'ライブラリ', 
      route: '/ipo/library' as Route, 
      icon: Library,
      description: 'ライブラリ'
    },
    { 
      label: '学転メディア', 
      route: '/madia' as Route, 
      icon: FileText,
      description: '学転メディア'
    },
    { 
      label: '特集', 
      route: '/features' as Route, 
      icon: Sparkles,
      description: '特集'
    },
    { 
      label: 'ログアウト', 
      route: '/ipo' as Route, // dummy route, will trigger logout
      icon: LogOut,
      description: 'ログアウト'
    },
  ];

  const routeMeta: Record<Route, { title: string; subtitle?: string } | undefined> = {
    '/ipo': { title: 'IPO University', subtitle: 'キャリア開発プラットフォーム' },
    '/ipo/dashboard': { title: 'ダッシュボード', subtitle: 'キャリア進捗の確認' },
    '/ipo/analysis': { title: '自己分析', subtitle: 'AIと対話しながら自己分析を進めましょう' },
    '/ipo/selection': { title: '選考管理', subtitle: '企業選考の進捗管理' },
    '/ipo/case': { title: 'ケース', subtitle: '問題解決スキル向上' },
    '/ipo/calendar': { title: 'カレンダー', subtitle: 'スケジュール管理' },
    '/ipo/library': { title: 'ライブラリ', subtitle: '業界・職種情報' },
    '/ipo/diagnosis': { title: '診断', subtitle: '性格・適職診断' },
    '/ipo/settings': { title: '設定' },
    '/ipo/ES': { title: 'ES管理', subtitle: 'エントリーシートを管理' },
    '/jobs': { title: '求人検索', subtitle: "求人の検索" },
    '/madia': { title: '学転メディア', subtitle: 'ニュース・コラム' },
    '/features': { title: '特集', subtitle: '編集部おすすめ' },
    '/ipo/login': undefined,
    '/student/scouts': { title: 'ヘッドハンティング', subtitle: 'スカウト情報の確認' },
    '/student/applications': { title: '応募履歴', subtitle: '応募の履歴' },
    '/chat': { title: 'チャット', subtitle: '企業や学生とコミュニケーション' },
  };

  // Nested route meta resolver: picks the longest matching prefix in routeMeta
  const resolveRouteMeta = (path: string) => {
    const entries = Object.entries(routeMeta) as [Route, { title: string; subtitle?: string } | undefined][];
    const match = entries
      .filter(([prefix]) => path.startsWith(prefix))
      .sort((a, b) => b[0].length - a[0].length)[0];
    return match ? match[1] : undefined;
  };

  const handleLogout = () => {
    // Clear user data and navigate to home
    localStorage.removeItem('ipo-user-data');
    navigate('/ipo');
    if (isMobile) { setOpenMobile(false); } else { setOpen(false); }
    setIsUserMenuOpen(false);
  };

  const handleSettingsClick = () => {
    navigate('/ipo/settings');
    if (isMobile) { setOpenMobile(false); } else { setOpen(false); }
    setIsUserMenuOpen(false);
  };

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const noSidebarRoutes: Route[] = ['/ipo/login'];
  const showSidebar = !noSidebarRoutes.includes(currentRoute);

  if (!showSidebar) {
    return (
      <main className="min-h-screen w-full overflow-auto">
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar
        variant="inset"
        collapsible="icon"
        className="group !bg-white dark:!bg-neutral-900 supports-[backdrop-filter]:!bg-white backdrop-blur-0 border-r border-neutral-200 dark:border-neutral-800 shadow-sm"
      >
        <SidebarHeader className="bg-white dark:bg-neutral-900">
          <div 
            className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-sidebar-accent rounded-lg transition-colors group-data-[collapsible=icon]:justify-center"
            onClick={() => handleNavigate('/ipo' as Route)}
          >
            <div className="w-8 h-8 min-w-[32px] min-h-[32px] aspect-square shrink-0 bg-gradient-to-br from-sky-500 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">IPO</span>
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="font-bold text-sidebar-foreground">IPO University</span>
              <span className="text-xs text-sidebar-foreground/70">キャリア開発プラットフォーム</span>
            </div>
            {user && (
              <div className="flex items-center mt-2 space-x-2 group-data-[collapsible=icon]:hidden">
                <Avatar className="h-5 w-5 shrink-0">
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
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">メインメニュー</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.route}>
                    <SidebarMenuButton
                      onClick={() => {
                        if (item.label === 'ログアウト') {
                          handleLogout();
                        } else if (currentRoute !== item.route) {
                          handleNavigate(item.route);
                        } else {
                          // If tapping the same route, only close on mobile
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }
                      }}
                      isActive={currentRoute === item.route}
                      tooltip={item.description}
                      className={`${item.label === 'ログアウト' 
                        ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30' 
                        : currentRoute === item.route 
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' 
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'} justify-start`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
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
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
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
          {user && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="w-full justify-start hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="group-data-[collapsible=icon]:hidden">ログアウト</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarFooter>
        
        <SidebarRail className="hidden sm:flex" />
      </Sidebar>
      
      <SidebarInset>
        {/* Header with sidebar trigger */}
        <header className="flex h-10 shrink-0 items-center gap-3 px-3 transition-[width,height] ease-linear border-b border-sidebar-border">
          <SidebarTrigger className="-ml-1" />
          {(() => {
            const meta = resolveRouteMeta(String(currentRoute));
            if (!meta) return null;
            return (
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-semibold">{meta.title}</h1>
                {meta.subtitle ? (
                  <span className="text-sm text-muted-foreground hidden sm:inline">{meta.subtitle}</span>
                ) : null}
              </div>
            );
          })()}
          {/* ===== Right actions: Notifications + Avatar ===== */}
          <div className="ml-auto flex items-center gap-4">
            {ready && isLoggedIn && session?.user && (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {/* 通知数のバッジを表示する場合はここに追加 */}
              </Button>
            )}

            {ready && isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt="avatar"
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User size={20} />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/forgot-password" className="flex items-center">
                      <Key size={16} className="mr-2" /> パスワード変更
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:bg-red-50"
                  >
                    <LogOut size={16} className="mr-2" /> ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
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