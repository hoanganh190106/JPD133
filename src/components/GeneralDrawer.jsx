import React, { useMemo } from 'react';
import { X, Layers, Bot, Sparkles, KeyRound } from 'lucide-react';
import vocabData from '../data/vocabulary_b1_11.json';
import { getDeletedVocabIds } from '../utils/aiClient';

const VOCAB_STATUS_KEY = 'jpd133_vocab_status_v1';

export default function GeneralDrawer({ isOpen, onClose, activeTab, onOpenAiSettings }) {
  const activeVocab = useMemo(() => {
    const deletedIds = getDeletedVocabIds();
    return vocabData.filter((v) => !deletedIds.has(v.id));
  }, []);

  const vocabStats = useMemo(() => {
    try {
      const saved = localStorage.getItem(VOCAB_STATUS_KEY);
      const statusMap = saved ? JSON.parse(saved) : {};
      const activeIds = new Set(activeVocab.map((v) => v.id));
      let mastered = 0;
      let review = 0;
      Object.entries(statusMap).forEach(([id, st]) => {
        if (!activeIds.has(Number(id)) && !activeIds.has(id)) return;
        if (st === 'mastered') mastered++;
        else if (st === 'review') review++;
      });
      return {
        total: activeVocab.length,
        mastered,
        review,
        unseen: Math.max(0, activeVocab.length - mastered - review),
      };
    } catch {
      return { total: activeVocab.length, mastered: 0, review: 0, unseen: activeVocab.length };
    }
  }, [activeVocab]);

  const lessonCounts = useMemo(() => {
    const counts = {};
    activeVocab.forEach((v) => {
      counts[v.lesson] = (counts[v.lesson] || 0) + 1;
    });
    return counts;
  }, [activeVocab]);

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-40 transition-opacity animate-fadeIn"
      />

      <aside className="fixed top-0 bottom-0 left-0 z-50 w-84 sm:w-92 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col animate-slideIn">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {activeTab === 'vocabulary' ? (
              <>
                <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Tiến độ Từ vựng (B1–11)
                </h2>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Trợ lý AI JPD133
                </h2>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {activeTab === 'vocabulary' && (
            <>
              <div className="p-3.5 bg-violet-50/75 dark:bg-violet-950/35 border border-violet-100 dark:border-violet-800/50 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-violet-900 dark:text-violet-200">
                  <span>Tiến độ học thuộc</span>
                  <span className="font-bold text-violet-700 dark:text-violet-300">
                    {Math.round((vocabStats.mastered / vocabStats.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-violet-200/60 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(vocabStats.mastered / vocabStats.total) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-300"
                  />
                  <div
                    style={{ width: `${(vocabStats.review / vocabStats.total) * 100}%` }}
                    className="bg-amber-400 h-full transition-all duration-300"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                  <span>
                    Đã thuộc: <b className="text-emerald-600 dark:text-emerald-400">{vocabStats.mastered}</b>
                  </span>
                  <span>
                    Cần ôn: <b className="text-amber-600 dark:text-amber-400">{vocabStats.review}</b>
                  </span>
                  <span>
                    Tổng từ: <b className="text-slate-800 dark:text-slate-200">{vocabStats.total}</b>
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                  Phân bố từ vựng theo bài
                </h3>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((lesson) => (
                    <div
                      key={lesson}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Bài {lesson}
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        {lessonCounts[lesson] || 0} từ
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Phím tắt Flashcard</span>
                </p>
                <div className="text-[11px] space-y-1.5 text-slate-500 dark:text-slate-400">
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">
                      Space
                    </kbd>{' '}
                    Lật mặt trước / sau
                  </div>
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">
                      ←
                    </kbd>{' '}
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">
                      →
                    </kbd>{' '}
                    Chuyển từ trước / sau
                  </div>
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">
                      S
                    </kbd>{' '}
                    Nghe phát âm tiếng Nhật
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'ai-lookup' && (
            <>
              <div className="p-4 bg-indigo-50/75 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Cơ chế ưu tiên 2 tầng</span>
                </div>
                <p className="text-xs text-indigo-800 dark:text-indigo-200/90 leading-relaxed">
                  <b>Tầng 1:</b> Tự động tra cứu trong kho 102 câu hình, 39 câu phản xạ, 16 bài đọc và {activeVocab.length} từ vựng có sẵn (miễn phí, 0ms).
                </p>
                <p className="text-xs text-indigo-800 dark:text-indigo-200/90 leading-relaxed">
                  <b>Tầng 2:</b> Nếu từ hoặc câu nằm ngoài giáo trình, AI sẽ phân tích Furigana, dịch nghĩa và bóc tách Kanji chi tiết.
                </p>
              </div>

              {onOpenAiSettings && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAiSettings();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Cài đặt API Key (Gemini / DeepSeek)</span>
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
