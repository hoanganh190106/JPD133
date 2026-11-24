import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Volume2,
  ClipboardPaste,
  Trash2,
  BookmarkPlus,
  Check,
  Clock,
  Languages,
  BookOpen,
  Loader2,
  AlertCircle,
  Settings,
  HelpCircle,
  Lightbulb,
  XCircle,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  getAiConfig,
  translateAndAnalyzeWithAi,
  getAiLookupHistory,
  saveAiLookupHistory,
  clearAiLookupHistory,
  saveCustomVocab,
  getCustomVocab,
  searchInCurriculum,
  getCachedAiResult,
} from '../utils/aiService';
import { renderJapaneseWithFurigana } from '../utils/japanese';

export default function AiLookupView({ speech, speed, onOpenAiSettings }) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState(() => getAiLookupHistory());
  const [savedWordIds, setSavedWordIds] = useState(
    () => new Set(getCustomVocab().map((item) => item.word_jp))
  );

  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text.trim());
      }
    } catch {
      // Ignore
    }
  };

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setInputText('');
    setAnalysisResult(null);
    setErrorMessage('');
    setIsLoading(false);
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setErrorMessage('Đã hủy yêu cầu phân tích AI.');
  };

  const handleLookup = async (textToSearch, forceAi = false) => {
    const target = (textToSearch || inputText).trim();
    if (!target) return;

    setErrorMessage('');

    if (!forceAi) {
      const curriculumMatch = searchInCurriculum(target);
      if (curriculumMatch) {
        setAnalysisResult(curriculumMatch);
        const historyItem = {
          id: 'hist_' + Date.now(),
          query: target,
          timestamp: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
          }),
          result: curriculumMatch,
        };
        setHistory(saveAiLookupHistory(historyItem));
        return;
      }

      const cached = getCachedAiResult(target);
      if (cached) {
        setAnalysisResult({ ...cached, isCached: true });
        const historyItem = {
          id: 'hist_' + Date.now(),
          query: target,
          timestamp: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
          }),
          result: cached,
        };
        setHistory(saveAiLookupHistory(historyItem));
        return;
      }
    }

    const config = getAiConfig();
    if (!config.apiKey || !config.apiKey.trim()) {
      setErrorMessage('Bạn chưa cài đặt API Key. Hãy bấm nút "Cài đặt AI" bên dưới để nhập Key.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const result = await translateAndAnalyzeWithAi(target, controller.signal, forceAi);
      setAnalysisResult(result);

      const historyItem = {
        id: 'hist_' + Date.now(),
        query: target,
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        }),
        result,
      };
      setHistory(saveAiLookupHistory(historyItem));
    } catch (error) {
      if (error.name === 'AbortError' || error.message?.includes('hủy')) {
        setErrorMessage('Đã hủy yêu cầu tra cứu AI.');
      } else {
        console.error(error);
        setErrorMessage(
          error.message || 'Lỗi khi gọi AI. Vui lòng kiểm tra lại kết nối mạng hoặc API Key.'
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSelectHistory = (item) => {
    setInputText(item.query);
    setAnalysisResult(item.result);
    setErrorMessage('');
  };

  const handleSaveToFlashcard = (vocab) => {
    const saved = saveCustomVocab({
      word: vocab.word,
      reading: vocab.reading,
      han_viet: vocab.han_viet,
      meaning: vocab.meaning,
      grammar: analysisResult?.grammar_explanation || '',
    });

    if (saved) {
      setSavedWordIds((prev) => new Set([...prev, vocab.word]));
    }
  };

  const sampleQueries = [
    '図書館',
    'nhà ga',
    'これはいくらですか。',
    '週末、友達と映画を見に行きます。',
    'お腹が痛いですから、病院へ行きます。',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
      {/* Banner */}
      <div
        className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 relative overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.35), transparent 55%), radial-gradient(circle at 88% 80%, rgba(244, 63, 94, 0.28), transparent 50%)',
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Translation &amp; Grammar Breakdown</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Trợ lý Tra cứu &amp; Dịch thuật (Nhật ↔ Việt)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Ưu tiên tra cứu 0ms trong kho giáo trình JPD133 trước; từ ngoài giáo trình sẽ được AI gắn Furigana, dịch nghĩa và bóc tách Kanji chi tiết.
            </p>
          </div>

          <button
            onClick={onOpenAiSettings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-semibold text-white border border-white/20 transition-colors shrink-0 self-start"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-200" />
            <span>Cài đặt AI</span>
          </button>
        </div>
      </div>

      {/* Input Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
            <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Nhập tiếng Nhật hoặc tiếng Việt</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePaste}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
              title="Dán văn bản từ clipboard"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Dán nhanh</span>
            </button>

            {inputText && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
                title="Xóa nội dung"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            )}
          </div>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleLookup();
            }
          }}
          placeholder="Ví dụ: 図書館, nhà ga, 駅までの道を教えてください..."
          rows={3}
          className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm sm:text-base font-japanese text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 resize-none transition-all"
        />

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 flex items-center gap-1 mr-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Gợi ý:</span>
          </span>
          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(sample);
                handleLookup(sample);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 text-[11px] font-japanese transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>

        <div className="pt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Mẹo: Nhấn{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono">
              Ctrl + Enter
            </kbd>{' '}
            để tra nhanh
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {isLoading ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs sm:text-sm font-bold transition-all"
                >
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Hủy yêu cầu</span>
                </button>

                <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600/85 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md cursor-wait">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI đang phân tích...</span>
                </div>
              </>
            ) : (
              <button
                onClick={() => handleLookup()}
                disabled={!inputText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tra cứu &amp; Phân tích</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Thông báo</p>
            <p>{errorMessage}</p>
            {errorMessage.includes('API Key') && (
              <button
                onClick={onOpenAiSettings}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-rose-700"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Mở Cài đặt AI ngay</span>
              </button>
            )}
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-5 animate-fadeIn">
          {analysisResult.isFromCurriculum && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-white dark:from-emerald-950/50 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-emerald-950 dark:text-emerald-100">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                      Tìm thấy trong giáo trình JPD133
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-extrabold">
                      0ms • Miễn phí
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 font-medium mt-0.5">
                    Nguồn: {analysisResult.source}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleLookup(inputText || analysisResult.input_text, true)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-emerald-100/70 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Nhờ AI phân tích sâu hơn</span>
              </button>
            </div>
          )}

          {analysisResult.isCached && !analysisResult.isFromCurriculum && (
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <span>
                  <b>Bộ nhớ đệm (0ms):</b> Tải tức thì kết quả đã phân tích từ trước.
                </span>
              </div>
              <button
                onClick={() => handleLookup(inputText || analysisResult.input_text, true)}
                disabled={isLoading}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 underline shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Phân tích lại</span>
              </button>
            </div>
          )}

          {/* 1. Ruby & Reading */}
          <div className="space-y-3 p-5 sm:p-6 bg-gradient-to-br from-indigo-50/70 via-indigo-50/30 to-slate-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Câu tiếng Nhật chuẩn &amp; Furigana</span>
              </span>

              <button
                onClick={() =>
                  speech.speak(analysisResult.japanese_plain || analysisResult.reading_hiragana, speed)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Phát âm ({speed}x)</span>
              </button>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-japanese leading-loose py-2 tracking-wide">
              {renderJapaneseWithFurigana(
                analysisResult.japanese_ruby_html || analysisResult.japanese_plain,
                true
              )}
            </div>

            {analysisResult.reading_hiragana && (
              <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-300 font-bold font-japanese border-t border-indigo-100/80 dark:border-indigo-900/60 pt-2">
                Cách đọc: {analysisResult.reading_hiragana}
              </p>
            )}
          </div>

          {/* 2. Meaning */}
          <div className="p-4 sm:p-5 bg-emerald-50/75 dark:bg-emerald-950/35 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Bản dịch tiếng Việt
            </span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {analysisResult.vietnamese_translation}
            </p>
          </div>

          {analysisResult.example_jp && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Câu ví dụ trong giáo trình
              </span>
              <p className="text-sm sm:text-base font-japanese font-bold text-slate-800 dark:text-slate-100">
                {analysisResult.example_jp}
              </p>
              {analysisResult.example_vi && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {analysisResult.example_vi}
                </p>
              )}
            </div>
          )}

          {/* 4. Breakdown */}
          {analysisResult.breakdown && analysisResult.breakdown.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Bóc tách từ vựng ({analysisResult.breakdown.length})</span>
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Bấm <span className="font-bold text-indigo-600 dark:text-indigo-400">+ Lưu</span> để ôn lại trong Flashcard
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysisResult.breakdown.map((item, idx) => {
                  const isSaved = savedWordIds.has(item.word);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-base sm:text-lg font-bold font-japanese text-slate-900 dark:text-white">
                            {item.word}
                          </span>
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-japanese">
                            {item.reading}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {item.han_viet && (
                            <span className="px-1.5 py-0.5 bg-indigo-100/80 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded font-semibold text-[10px]">
                              {item.han_viet}
                            </span>
                          )}
                          <span>{item.meaning}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => speech.speak(item.reading || item.word, speed)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                          title="Nghe phát âm từ này"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleSaveToFlashcard(item)}
                          disabled={isSaved}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSaved
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span className="text-[11px]">Đã lưu</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3 h-3" />
                              <span className="text-[11px]">+ Lưu</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {analysisResult.grammar_explanation && (
            <div className="p-4 sm:p-5 bg-amber-50/75 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>Giải thích ngữ pháp &amp; Cấu trúc câu</span>
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {analysisResult.grammar_explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Lịch sử tra cứu gần đây ({history.length}/20)</span>
            </span>

            <button
              onClick={() => {
                clearAiLookupHistory();
                setHistory([]);
              }}
              className="text-[11px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold"
            >
              Xóa lịch sử
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectHistory(item)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs text-slate-700 dark:text-slate-200 font-japanese transition-all flex items-center gap-2"
                title={`Tra lại: ${item.query}`}
              >
                <span className="truncate max-w-[200px]">{item.query}</span>
                <span className="text-[10px] text-slate-400 font-sans">{item.timestamp}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
