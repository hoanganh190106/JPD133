import React from 'react';
import {
  Menu,
  Settings,
  Languages,
  Volume2,
  Clock,
  Image as ImageIcon,
  MessageSquare,
  BookOpen,
  Layers,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';

const MODE_TABS = [
  {
    id: 'image',
    label: 'Có hình',
    count: '102',
    Icon: ImageIcon,
    activeClass:
      'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm border-slate-200/80 dark:border-slate-700',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300',
  },
  {
    id: 'no-image',
    label: 'Phản xạ',
    count: '39',
    Icon: MessageSquare,
    activeClass:
      'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-300 shadow-sm border-slate-200/80 dark:border-slate-700',
    badgeClass: 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300',
  },
  {
    id: 'reading',
    label: 'Luyện đọc',
    count: '16',
    Icon: BookOpen,
    activeClass:
      'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-300 shadow-sm border-slate-200/80 dark:border-slate-700',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300',
  },
  {
    id: 'vocabulary',
    label: 'Từ vựng',
    count: 'B1–11',
    Icon: Layers,
    activeClass:
      'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-300 shadow-sm border-slate-200/80 dark:border-slate-700',
    badgeClass: 'bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300',
  },
  {
    id: 'ai-lookup',
    label: 'Dịch AI',
    count: 'AI',
    Icon: Sparkles,
    activeClass:
      'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-300 shadow-sm border-slate-200/80 dark:border-slate-700',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300',
  },
];

export default function Header({
  activeTab,
  setActiveTab,
  speed,
  setSpeed,
  showFurigana,
  setShowFurigana,
  isDark,
  onToggleTheme,
  toggleSidebar,
  isSidebarOpen,
  onOpenMockTest,
  onOpenAiSettings,
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/90 shadow-2xs transition-colors">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Left: Menu + Brand + 5 Mode Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 active:scale-95 ${
                isSidebarOpen
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={isSidebarOpen ? 'Thu gọn danh sách bên trái' : 'Mở danh sách bên trái'}
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand mark */}
            <div className="hidden 2xl:flex items-center gap-2 shrink-0 pr-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 ring-1 ring-white/20">
                <span className="font-extrabold text-xs tracking-tight font-japanese">日本語</span>
              </div>
              <div className="leading-none">
                <span className="block text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                  JPD133
                </span>
                <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                  Speaking Studio
                </span>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <nav
              aria-label="Chế độ học"
              className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 overflow-x-auto no-scrollbar max-w-full"
            >
              {MODE_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.Icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all border ${
                      isActive
                        ? `${tab.activeClass} font-bold`
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold leading-none ${
                        isActive
                          ? tab.badgeClass
                          : 'bg-slate-200/60 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 transition-all active:scale-95"
              title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              aria-label="Đổi giao diện Sáng/Tối"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Cài đặt AI */}
            <button
              onClick={onOpenAiSettings}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all active:scale-95"
              title="Cài đặt API Key & Model AI (Google Gemini / DeepSeek)"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cài đặt AI</span>
            </button>

            {/* Furigana Toggle */}
            <button
              onClick={() => setShowFurigana(!showFurigana)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                showFurigana
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title={showFurigana ? 'Đang bật Furigana' : 'Đang tắt Furigana'}
            >
              <Languages className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">Furigana:</span>
              <span>{showFurigana ? 'Bật' : 'Tắt'}</span>
            </button>

            {/* Speed Selector */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
              <span className="px-1.5 text-slate-400 dark:text-slate-500 hidden lg:inline" title="Tốc độ đọc">
                <Volume2 className="w-3.5 h-3.5" />
              </span>
              {[0.5, 0.75, 1.0, 1.25].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                    speed === s
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title={`Tốc độ đọc ${s}x`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Nút Thi thử */}
            <button
              onClick={onOpenMockTest}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 ${
                activeTab === 'mocktest'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-300 dark:ring-rose-800'
                  : 'bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 text-white hover:brightness-105 shadow-sm shadow-rose-500/20'
              }`}
              title="Phòng thi thử ngẫu nhiên"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thi thử</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
