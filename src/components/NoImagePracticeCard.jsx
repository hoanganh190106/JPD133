import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  MessageSquareQuote,
  Lightbulb,
  Headphones,
} from 'lucide-react';
import { renderJapaneseWithFurigana } from '../utils/japanese';

export default function NoImagePracticeCard({
  question,
  totalCount,
  onPrev,
  onNext,
  onRandom,
  onStatusChange,
  status,
  showFurigana,
  speech,
  speed,
  setSpeed,
}) {
  const [showQuestionText, setShowQuestionText] = useState(false);
  const [showVietnamese, setShowVietnamese] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    return () => {
      speech.stop();
    };
  }, [speech]);

  const toggleAll = (show) => {
    setShowQuestionText(show);
    setShowVietnamese(show);
    setShowGrammar(show);
    setShowAnswer(show);
  };

  const isAllShowing = showQuestionText && showVietnamese && showGrammar && showAnswer;

  const handleSpeakQuestion = () => {
    if (speech.isSpeaking) {
      speech.stop();
    } else {
      speech.speak(question.q_jp, speed);
    }
  };

  const speeds = [0.5, 0.75, 1.0, 1.25];
  const handleCycleSpeed = (e) => {
    e.stopPropagation();
    if (!setSpeed) return;
    const currentIdx = speeds.indexOf(speed);
    const nextIdx = currentIdx === -1 ? 2 : (currentIdx + 1) % speeds.length;
    setSpeed(speeds[nextIdx]);
  };

  const handleSpeakAnswer = () => {
    if (speech.isSpeaking && speech.currentText === question.a_jp) {
      speech.stop();
    } else {
      speech.speak(question.a_jp, speed);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95"
            title="Câu trước (Phím ←)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Trước</span>
          </button>

          <span className="px-3 py-1.5 text-xs font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 border border-teal-200/60 dark:border-teal-800/60 rounded-xl tabular-nums">
            Câu {question.id} / {totalCount}
          </span>

          <button
            onClick={onNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95"
            title="Câu sau (Phím →)"
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onRandom}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/70 hover:text-teal-600 dark:hover:text-teal-300 text-slate-600 dark:text-slate-300 transition-all ml-0.5 active:scale-95"
            title="Câu ngẫu nhiên"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStatusChange(question.id, status === 'review' ? 'unseen' : 'review')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
              status === 'review'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Cần ôn lại</span>
          </button>

          <button
            onClick={() => onStatusChange(question.id, status === 'mastered' ? 'unseen' : 'mastered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
              status === 'mastered'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã thuộc</span>
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-50/90 via-teal-50/40 to-slate-50/90 dark:from-slate-900 dark:via-teal-950/30 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-teal-600 text-white text-xs font-bold rounded-lg shadow-xs">
              Bài {question.lesson}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Câu hỏi phản xạ #{question.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              Chủ điểm:
            </span>
            <span className="px-3 py-1 bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 border border-teal-100 dark:border-teal-800/60 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs">
              {question.grammar}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* Reflex Stage Box */}
          <div
            className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-9 shadow-lg border border-slate-800 flex flex-col items-center justify-center min-h-[230px] sm:min-h-[270px] text-center space-y-4"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.22), transparent 55%), radial-gradient(circle at 85% 80%, rgba(99, 102, 241, 0.24), transparent 55%)',
            }}
          >
            <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold uppercase tracking-wider">
              <MessageSquareQuote className="w-4 h-4" />
              <span>Phản xạ vấn đáp trực tiếp (Không nhìn tranh)</span>
              {speech.isSpeaking && (
                <span className="inline-flex items-end gap-0.5 h-3.5 ml-1" aria-hidden="true">
                  <span className="w-1 h-full bg-teal-400 rounded-full sound-bar" />
                  <span className="w-1 h-full bg-teal-300 rounded-full sound-bar" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1 h-full bg-indigo-300 rounded-full sound-bar" style={{ animationDelay: '0.3s' }} />
                </span>
              )}
            </div>

            <div className="max-w-2xl min-h-[72px] flex items-center justify-center">
              {showQuestionText ? (
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold leading-relaxed text-white tracking-wide font-japanese animate-fadeIn">
                  {renderJapaneseWithFurigana(question.q_jp, showFurigana)}
                </h3>
              ) : (
                <div className="space-y-2 text-slate-300">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto text-teal-300">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-slate-100">
                    Nội dung câu hỏi đang ẩn để luyện nghe chay
                  </p>
                  <p className="text-xs text-teal-300/90">
                    Bấm &ldquo;Nghe câu hỏi&rdquo; bên dưới hoặc nhấn phím Space
                  </p>
                </div>
              )}
            </div>

            {showVietnamese && (
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl text-xs sm:text-sm text-indigo-100 max-w-xl border border-white/15 animate-fadeIn">
                <b>Dịch nghĩa:</b> {question.q_vi}
              </div>
            )}
          </div>

          {/* Listening & Visibility Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-teal-50/60 dark:bg-teal-950/25 border border-teal-100 dark:border-teal-900/50 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex rounded-xl shadow-xs overflow-hidden border border-teal-600 dark:border-teal-500">
                <button
                  onClick={handleSpeakQuestion}
                  className={`flex items-center gap-2 px-3.5 py-2 font-bold text-xs sm:text-sm transition-all ${
                    speech.isSpeaking
                      ? 'bg-rose-500 text-white'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                  title="Nghe máy đọc câu hỏi (Phím Space)"
                >
                  {speech.isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Dừng đọc</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Nghe câu hỏi</span>
                    </>
                  )}
                </button>

                {setSpeed && (
                  <button
                    onClick={handleCycleSpeed}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-mono font-bold text-xs px-2.5 py-2 border-l border-teal-500/60 transition-colors"
                    title="Bấm để đổi nhanh tốc độ đọc"
                  >
                    {speed}x
                  </button>
                )}
              </div>

              {setSpeed && (
                <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-800 px-2 py-1 rounded-xl border border-teal-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">
                    Tốc độ:
                  </span>
                  {[0.5, 0.75, 1.0, 1.25].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        speed === s
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-teal-900/70 dark:text-slate-300 hover:text-teal-900 dark:hover:text-white hover:bg-teal-50 dark:hover:bg-slate-700'
                      }`}
                      title={`Đổi tốc độ ${s}x`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setShowQuestionText(!showQuestionText)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showQuestionText
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {showQuestionText ? 'Ẩn câu hỏi' : 'Hiện câu hỏi'}
              </button>

              <button
                onClick={() => setShowVietnamese(!showVietnamese)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showVietnamese
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {showVietnamese ? 'Ẩn dịch VI' : 'Hiện dịch VI'}
              </button>

              <button
                onClick={() => setShowGrammar(!showGrammar)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showGrammar
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {showGrammar ? 'Ẩn ngữ pháp' : 'Gợi ý ngữ pháp'}
              </button>

              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showAnswer
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}
              </button>

              <button
                onClick={() => toggleAll(!isAllShowing)}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
                title={isAllShowing ? 'Ẩn tất cả' : 'Hiện tất cả'}
              >
                {isAllShowing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showGrammar && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200 font-bold text-xs flex-wrap">
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Cấu trúc ngữ pháp áp dụng:</span>
                <span className="px-2 py-0.5 bg-indigo-200/60 dark:bg-indigo-900/80 rounded-md text-indigo-950 dark:text-indigo-100 font-mono text-[11px]">
                  {question.grammar}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-800 dark:text-indigo-200/90 leading-relaxed pl-5">
                {question.grammar_meaning}
              </p>
            </div>
          )}

          {showAnswer && (
            <div className="p-5 rounded-2xl bg-emerald-50/75 dark:bg-emerald-950/35 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3 animate-fadeIn">
              <div className="flex items-start gap-3">
                <button
                  onClick={handleSpeakAnswer}
                  className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors shrink-0"
                  title="Nghe câu trả lời mẫu"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <div className="flex-1 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Câu trả lời mẫu (kèm Furigana)
                  </span>

                  <div className="text-base sm:text-lg font-semibold text-emerald-950 dark:text-emerald-100 leading-relaxed font-japanese">
                    {renderJapaneseWithFurigana(question.a_jp, showFurigana)}
                  </div>

                  <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300/90 italic pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/50">
                    <b>Dịch nghĩa:</b> {question.a_vi}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
