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
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { renderJapaneseWithFurigana } from '../utils/japanese';

export default function PracticeCard({
  question,
  nextImageSrc,
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
  const [showAnswer, setShowAnswer] = useState(false);
  const [isZoomImage, setIsZoomImage] = useState(false);

  useEffect(() => {
    return () => {
      speech.stop();
    };
  }, [speech]);

  useEffect(() => {
    if (!nextImageSrc) return;
    const img = new Image();
    img.src = nextImageSrc;
  }, [nextImageSrc]);

  const toggleAll = (show) => {
    setShowQuestionText(show);
    setShowVietnamese(show);
    setShowAnswer(show);
  };

  const isAllShowing = showQuestionText && showVietnamese && showAnswer;

  const handleSpeakAllQuestions = () => {
    if (speech.isSpeaking) {
      speech.stop();
      return;
    }
    const allQuestionsText = question.qa.map((item) => item.q_jp).join(' ... ');
    speech.speak(allQuestionsText, speed);
  };

  const speeds = [0.5, 0.75, 1.0, 1.25];
  const handleCycleSpeed = (e) => {
    e.stopPropagation();
    if (!setSpeed) return;
    const currentIdx = speeds.indexOf(speed);
    const nextIdx = currentIdx === -1 ? 2 : (currentIdx + 1) % speeds.length;
    setSpeed(speeds[nextIdx]);
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

          <span className="px-3 py-1.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl tabular-nums">
            {question.id} / {totalCount}
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
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 transition-all ml-0.5 active:scale-95"
            title="Hình ngẫu nhiên"
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
        {/* Card Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-50/90 via-indigo-50/40 to-slate-50/90 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs">
              Lesson {question.lesson}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Hình {question.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              Mẫu ngữ pháp:
            </span>
            <span className="px-3 py-1 bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800/60 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs">
              {question.grammar}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* Studio Image Frame (giữ nền trắng bên trong khung ảnh để tranh vẽ luôn rõ nét ở cả Dark Mode) */}
          <div className="relative group bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-center min-h-[220px] sm:min-h-[300px] overflow-hidden">
            <div className="bg-white rounded-xl p-2 shadow-sm ring-1 ring-slate-900/5">
              <img
                src={question.image}
                alt={`Minh họa Hình ${question.id}`}
                onClick={() => setIsZoomImage(true)}
                className="max-h-[340px] w-auto max-w-full object-contain rounded-lg cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.015]"
                loading="eager"
                decoding="async"
              />
            </div>

            <button
              onClick={() => setIsZoomImage(true)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/90 dark:bg-slate-900/85 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 shadow-md border border-slate-200/70 dark:border-slate-700 transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
              title="Phóng to ảnh"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Listening & Visibility Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/90 dark:border-indigo-900/60 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex rounded-xl shadow-xs overflow-hidden border border-indigo-600 dark:border-indigo-500">
                <button
                  onClick={handleSpeakAllQuestions}
                  className={`flex items-center gap-2 px-3.5 py-2 font-bold text-xs sm:text-sm transition-all ${
                    speech.isSpeaking
                      ? 'bg-rose-500 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-mono font-bold text-xs px-2.5 py-2 border-l border-indigo-500/60 transition-colors"
                    title="Bấm để đổi nhanh tốc độ đọc (0.5x -> 0.75x -> 1x -> 1.25x)"
                  >
                    {speed}x
                  </button>
                )}
              </div>

              {setSpeed && (
                <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-800 px-2 py-1 rounded-xl border border-indigo-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">
                    Tốc độ:
                  </span>
                  {[0.5, 0.75, 1.0, 1.25].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        speed === s
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-indigo-900/70 dark:text-slate-300 hover:text-indigo-900 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-slate-700'
                      }`}
                      title={`Đổi tốc độ ${s}x`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility Toggles */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setShowQuestionText(!showQuestionText)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showQuestionText
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {showQuestionText ? 'Ẩn câu hỏi' : 'Hiện câu hỏi'}
              </button>

              <button
                onClick={() => setShowVietnamese(!showVietnamese)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showVietnamese
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {showVietnamese ? 'Ẩn dịch VI' : 'Hiện dịch VI'}
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

          {/* QA List Section */}
          <div className="space-y-3.5">
            {question.qa.map((item, index) => {
              const isSpeakingThisQ = speech.isSpeaking && speech.currentText === item.q_jp;
              const isSpeakingThisA = speech.isSpeaking && speech.currentText === item.a_jp;

              return (
                <div
                  key={index}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300/80 dark:hover:border-indigo-700 transition-colors space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        if (isSpeakingThisQ) speech.stop();
                        else speech.speak(item.q_jp, speed);
                      }}
                      className={`p-2.5 rounded-xl shrink-0 transition-all active:scale-95 ${
                        isSpeakingThisQ
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                          : 'bg-indigo-100/90 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900'
                      }`}
                      title="Nghe câu hỏi này"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                          Câu {index + 1}:
                        </span>
                        {!showQuestionText && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            Nội dung đang ẩn — bấm loa để nghe hoặc bật &ldquo;Hiện câu hỏi&rdquo;
                          </span>
                        )}
                      </div>

                      {showQuestionText && (
                        <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed font-japanese animate-fadeIn">
                          {renderJapaneseWithFurigana(item.q_jp, showFurigana)}
                        </div>
                      )}

                      {showVietnamese && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 inline-block animate-fadeIn">
                          {item.q_vi}
                        </p>
                      )}
                    </div>
                  </div>

                  {showAnswer && (
                    <div className="sm:ml-12 pt-3 flex items-start gap-3 bg-emerald-50/80 dark:bg-emerald-950/35 p-3.5 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 animate-fadeIn">
                      <button
                        onClick={() => {
                          if (isSpeakingThisA) speech.stop();
                          else speech.speak(item.a_jp, speed);
                        }}
                        className={`p-2 rounded-lg shrink-0 transition-all ${
                          isSpeakingThisA
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800'
                        }`}
                        title="Nghe phát âm câu trả lời mẫu"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex-1 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                          Trả lời mẫu
                        </span>
                        <div className="text-sm sm:text-base font-semibold text-emerald-950 dark:text-emerald-100 leading-relaxed font-japanese">
                          {renderJapaneseWithFurigana(item.a_jp, showFurigana)}
                        </div>
                        {showVietnamese && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-300/90 italic">
                            {item.a_vi}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isZoomImage && (
        <div
          onClick={() => setIsZoomImage(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={question.image}
              alt={`Hình ${question.id}`}
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain bg-white p-3"
            />
            <button
              onClick={() => setIsZoomImage(false)}
              className="absolute -top-3 -right-3 p-2.5 bg-white text-slate-800 rounded-full shadow-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Đóng"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
