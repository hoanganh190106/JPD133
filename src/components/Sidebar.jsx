import React, { useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { filterImageQuestions } from '../utils/filters';

export default function Sidebar({
  isOpen,
  onClose,
  questions,
  currentId,
  onSelectQuestion,
  lessonFilter,
  setLessonFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  progress,
  onResetProgress,
}) {
  const filteredQuestions = useMemo(
    () =>
      filterImageQuestions(questions, {
        lessonFilter,
        statusFilter,
        searchQuery,
        progress,
      }),
    [questions, lessonFilter, statusFilter, searchQuery, progress]
  );

  const counts = useMemo(() => {
    let mastered = 0;
    let review = 0;
    let unseen = 0;
    questions.forEach((q) => {
      const s = progress[q.id];
      if (s === 'mastered') mastered++;
      else if (s === 'review') review++;
      else unseen++;
    });
    return { mastered, review, unseen, total: questions.length };
  }, [questions, progress]);

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-40 transition-opacity animate-fadeIn lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-80 sm:w-88 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out lg:sticky lg:top-16 lg:bottom-auto lg:left-auto lg:z-10 lg:shadow-none lg:h-[calc(100vh-4rem)] shrink-0 ${
          isOpen
            ? 'translate-x-0 shadow-2xl lg:shadow-none lg:flex'
            : '-translate-x-full lg:hidden'
        }`}
      >
        {/* Top Header */}
        <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                Danh sách 102 Hình
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Luyện nói theo tranh Bài 8–11
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Thu gọn danh sách"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress summary bar */}
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            <span>Tiến độ học tập</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {Math.round((counts.mastered / counts.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${(counts.mastered / counts.total) * 100}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Đã thuộc: ${counts.mastered}`}
            />
            <div
              style={{ width: `${(counts.review / counts.total) * 100}%` }}
              className="bg-amber-400 h-full transition-all duration-300"
              title={`Cần ôn lại: ${counts.review}`}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Thuộc: <b className="text-slate-700 dark:text-slate-200">{counts.mastered}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Ôn lại: <b className="text-slate-700 dark:text-slate-200">{counts.review}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
              Chưa: <b className="text-slate-700 dark:text-slate-200">{counts.unseen}</b>
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm số hình, ngữ pháp, câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-xl border border-slate-200/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lesson Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: '8', label: 'Bài 8' },
              { id: '9', label: 'Bài 9' },
              { id: '10', label: 'Bài 10' },
              { id: '11', label: 'Bài 11' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLessonFilter(tab.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold whitespace-nowrap transition-all ${
                  lessonFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="grid grid-cols-4 gap-1 text-[11px]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`py-1.5 px-1.5 rounded-lg text-center transition-all font-semibold ${
                statusFilter === 'all'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('review')}
              className={`py-1.5 px-1.5 rounded-lg text-center transition-all font-semibold flex items-center justify-center gap-1 ${
                statusFilter === 'review'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/70 dark:border-amber-800/60'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              Ôn lại
            </button>
            <button
              onClick={() => setStatusFilter('mastered')}
              className={`py-1.5 px-1.5 rounded-lg text-center transition-all font-semibold flex items-center justify-center gap-1 ${
                statusFilter === 'mastered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/70 dark:border-emerald-800/60'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Thuộc
            </button>
            <button
              onClick={() => setStatusFilter('unseen')}
              className={`py-1.5 px-1.5 rounded-lg text-center transition-all font-semibold ${
                statusFilter === 'unseen'
                  ? 'bg-slate-500 dark:bg-slate-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Chưa
            </button>
          </div>
        </div>

        {/* Question List Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Không tìm thấy hình nào phù hợp
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isSelected = q.id === currentId;
              const status = progress[q.id];

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    onSelectQuestion(q.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-start gap-3 border ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-400/80 dark:border-indigo-500/70 shadow-xs'
                      : 'border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                      <img
                        src={q.image}
                        alt={`Hình ${q.id}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <span
                      className={`absolute -top-1.5 -left-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md shadow-xs ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 dark:bg-slate-700 text-white'
                      }`}
                    >
                      #{q.id}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.5 bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-md leading-none">
                        L{q.lesson}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        Hình {q.id}
                      </span>
                      {status === 'mastered' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-auto" />
                      )}
                      {status === 'review' && (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-auto" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {q.grammar}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {q.qa.length} câu hỏi
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>
            Tìm thấy: <b className="text-slate-800 dark:text-slate-200">{filteredQuestions.length}</b> / 102
          </span>
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ (xóa lịch sử Đã thuộc / Cần ôn)?'
                )
              ) {
                onResetProgress();
              }
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline"
            title="Đặt lại tiến độ học"
          >
            <RotateCcw className="w-3 h-3" />
            Reset tiến độ
          </button>
        </div>
      </aside>
    </>
  );
}
