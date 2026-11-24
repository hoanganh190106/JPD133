import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Shuffle, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  MousePointer,
  Highlighter, 
  Eraser, 
  Trash2, 
  Check,
  BookmarkPlus,
  Loader2
} from 'lucide-react';
import { renderJapaneseWithFurigana } from '../utils/japanese';
import vocabData from '../data/vocabulary_b1_11.json';
import { 
  searchInLocalKnowledge, 
  explainWordOrPhraseWithAi, 
  saveCustomVocab, 
  getAiConfig,
  getCustomVocab 
} from '../utils/aiService';

export default function ReadingPracticeCard({
  passage,
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
  onOpenAiSettings
}) {
  // Trạng thái Chế độ phòng thi (remount tự reset theo key={passage.id})
  const [showViText, setShowViText] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showKanjiCheck, setShowKanjiCheck] = useState(false);
  const [showHighlightedWords, setShowHighlightedWords] = useState(false);
  
  // Trạng thái mở chi tiết dịch & đáp án của từng câu hỏi { [index]: boolean }
  const [revealedAnswers, setRevealedAnswers] = useState({});

  // Công cụ: 'cursor' (Con trỏ / Copy) | 'highlighter' (Bút bôi) | 'eraser' (Tẩy)
  const [toolMode, setToolMode] = useState('cursor');

  // Danh sách các đoạn text đã bôi đánh dấu
  const [highlights, setHighlights] = useState(() => {
    try {
      const saved = localStorage.getItem(`jpd133_highlights_p${passage.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Đồng hồ bấm giờ đọc bài (Stopwatch)
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // Dừng TTS và dọn timer khi rời bài hoặc unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      speech.stop();
    };
  }, [speech]);

  // Lưu highlights vào localStorage
  const saveHighlights = (newHighlights) => {
    setHighlights(newHighlights);
    try {
      localStorage.setItem(`jpd133_highlights_p${passage.id}`, JSON.stringify(newHighlights));
    } catch (e) {
      console.warn('Cannot save highlights to localStorage', e);
    }
  };

  // Stopwatch effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setSeconds(0);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Nghe đọc mẫu toàn bộ bài đọc
  const handleSpeakPassage = () => {
    if (speech.isSpeaking && speech.currentText === passage.jp_text) {
      speech.stop();
    } else {
      speech.speak(passage.jp_text, speed);
    }
  };

  // Nghe đọc từng câu hỏi
  const handleSpeakQuestion = (q_jp) => {
    if (speech.isSpeaking && speech.currentText === q_jp) {
      speech.stop();
    } else {
      speech.speak(q_jp, speed);
    }
  };

  // Nghe đọc câu trả lời mẫu
  const handleSpeakAnswer = (a_jp) => {
    if (speech.isSpeaking && speech.currentText === a_jp) {
      speech.stop();
    } else {
      speech.speak(a_jp, speed);
    }
  };

  const toggleRevealAnswer = (index) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // ==========================================
  // XỬ LÝ BÚT BÔI & CỤC TẨY
  // ==========================================
  const handleTextSelection = () => {
    // CHỈ khi đang ở chế độ 'highlighter' mới đánh dấu màu hồng
    if (toolMode !== 'highlighter') return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const rawText = selection.toString().trim();
    if (!rawText || rawText.length === 0) return;

    // Tránh thêm rỗng hoặc trùng lặp hoàn toàn
    if (!highlights.includes(rawText)) {
      const updated = [...highlights, rawText];
      saveHighlights(updated);
    }

    selection.removeAllRanges();
  };

  const handleHighlightClick = (sliceText) => {
    if (toolMode === 'eraser') {
      const cleanSlice = sliceText.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/[（(].*?[）)]/g, '').trim();
      const updated = highlights.filter(h => 
        h !== sliceText && 
        h !== cleanSlice && 
        !sliceText.includes(h) && 
        !h.includes(cleanSlice)
      );
      saveHighlights(updated);
    }
  };

  const handleClearAllHighlights = () => {
    if (highlights.length === 0) return;
    if (window.confirm('Bạn có muốn xóa toàn bộ vết bôi đánh dấu trong bài này không?')) {
      saveHighlights([]);
    }
  };

  // Khi bấm "✓ Đã nhớ" ở thẻ từ bên dưới
  const handleRememberWord = (word) => {
    const updated = highlights.filter(h => !h.includes(word) && !word.includes(h));
    saveHighlights(updated);
  };

  // ==========================================
  // XỬ LÝ KIỂM TRA 2 TẦNG: TÀI LIỆU TRƯỚC - AI SAU
  // ==========================================
  const [aiResults, setAiResults] = useState({});
  const [loadingAiPhrases, setLoadingAiPhrases] = useState({});
  const [savedFlashcards, setSavedFlashcards] = useState(
    () => new Set(getCustomVocab().map((item) => item.word_jp))
  );
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [aiError, setAiError] = useState('');

  // Duyệt qua từng vết bôi theo 2 tầng:
  // Tầng 1: Tra cứu tài liệu (all_kanji_words, kanji_check, vocabulary_b1_11.json, localStorage)
  // Tầng 2: Ngoài tài liệu (sẵn sàng gọi AI)
  const processedHighlightedItems = useMemo(() => {
    if (!highlights || highlights.length === 0) return [];

    const items = [];
    const seenWords = new Set();

    highlights.forEach(h => {
      if (!h || !h.trim()) return;
      const clean = h.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/（[^）]*）|\([^)]*\)/g, '').trim();
      if (!clean || seenWords.has(clean)) return;
      seenWords.add(clean);

      // Tầng 1: Tra cứu tài liệu có sẵn (Ưu tiên 100% không tốn API)
      const local = searchInLocalKnowledge(clean, passage, vocabData);
      if (local) {
        items.push({
          rawText: h,
          cleanWord: local.word || clean,
          reading: local.reading,
          meaning: local.meaning,
          han_viet: local.han_viet,
          on_reading: local.on_reading,
          kun_reading: local.kun_reading,
          lesson: local.lesson,
          examples: local.examples,
          isKanji: !!local.isKanji,
          source: local.source,
          isLocal: true
        });
      } else {
        // Tầng 2: Ngoài tài liệu
        items.push({
          rawText: h,
          cleanWord: clean,
          isLocal: false,
          aiData: aiResults[clean] || null,
          isTranslating: !!loadingAiPhrases[clean]
        });
      }
    });

    return items;
  }, [highlights, passage, aiResults, loadingAiPhrases]);

  // Đếm số từ ngoài tài liệu chưa dịch
  const unTranslatedCount = useMemo(() => {
    return processedHighlightedItems.filter(item => !item.isLocal && !item.aiData).length;
  }, [processedHighlightedItems]);

  // Dịch 1 từ ngoài tài liệu bằng AI
  const handleTranslateSingleItem = async (cleanWord) => {
    const config = getAiConfig();
    if (!config.apiKey || !config.apiKey.trim()) {
      if (onOpenAiSettings) onOpenAiSettings();
      else alert('Vui lòng cài đặt API Key trước khi dịch AI.');
      return;
    }

    setLoadingAiPhrases(prev => ({ ...prev, [cleanWord]: true }));
    setAiError('');

    try {
      const res = await explainWordOrPhraseWithAi(cleanWord, passage.jp_text);
      setAiResults(prev => ({ ...prev, [cleanWord]: res }));
    } catch (err) {
      console.error(err);
      setAiError(err.message || 'Lỗi khi gọi AI');
    } finally {
      setLoadingAiPhrases(prev => ({ ...prev, [cleanWord]: false }));
    }
  };

  // Dịch tất cả từ ngoài tài liệu
  const handleTranslateAllExternal = async () => {
    const config = getAiConfig();
    if (!config.apiKey || !config.apiKey.trim()) {
      if (onOpenAiSettings) onOpenAiSettings();
      else alert('Vui lòng cài đặt API Key trước khi dịch AI.');
      return;
    }

    const needTranslate = processedHighlightedItems.filter(item => !item.isLocal && !item.aiData);
    if (needTranslate.length === 0) return;

    setIsTranslatingAll(true);
    setAiError('');

    for (const it of needTranslate) {
      setLoadingAiPhrases(prev => ({ ...prev, [it.cleanWord]: true }));
      try {
        const res = await explainWordOrPhraseWithAi(it.cleanWord, passage.jp_text);
        setAiResults(prev => ({ ...prev, [it.cleanWord]: res }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAiPhrases(prev => ({ ...prev, [it.cleanWord]: false }));
      }
    }

    setIsTranslatingAll(false);
  };

  // Lưu từ AI vào Flashcard
  const handleSaveToFlashcard = (cleanWord, aiData) => {
    saveCustomVocab({
      word: cleanWord,
      reading: aiData.reading,
      meaning: aiData.meaning_vi,
      han_viet: aiData.han_viet,
      grammar: aiData.grammar_notes
    });
    setSavedFlashcards(prev => new Set([...prev, cleanWord]));
  };

  // Phân tách jp_text thành các lát cắt (slices) có đánh dấu highlight
  const textSlices = useMemo(() => {
    const text = passage.jp_text;
    if (!highlights || highlights.length === 0) {
      return [{ text, isHighlight: false }];
    }

    let intervals = [];
    highlights.forEach(h => {
      if (!h) return;
      let idx = 0;
      while ((idx = text.indexOf(h, idx)) !== -1) {
        let start = idx;
        let end = idx + h.length;

        // Nếu từ này được bọc bởi thẻ <ruby>...</ruby>: mở rộng start và end bao trọn thẻ ruby
        if (start >= 6 && text.substring(start - 6, start) === '<ruby>') {
          const rubyCloseIdx = text.indexOf('</ruby>', end);
          if (rubyCloseIdx !== -1) {
            start = start - 6;
            end = rubyCloseIdx + 7;
          }
        } else {
          // Hoặc kiểm tra nếu ngay sau đó là cụm furigana trong ngoặc cũ (dự phòng)
          const rem = text.substring(end);
          const fm = rem.match(/^[（(][ぁ-んァ-ヶー0-9]+[）)]/);
          if (fm) {
            end += fm[0].length;
          }
        }

        intervals.push({ start, end, text: text.substring(start, end) });
        idx = end;
      }
    });

    if (intervals.length === 0) {
      return [{ text, isHighlight: false }];
    }

    // Sắp xếp và hợp nhất các khoảng chồng chéo
    intervals.sort((a, b) => a.start - b.start);
    let merged = [];
    for (let iv of intervals) {
      if (merged.length === 0) {
        merged.push({ ...iv });
      } else {
        let last = merged[merged.length - 1];
        if (iv.start <= last.end) {
          last.end = Math.max(last.end, iv.end);
          last.text = text.substring(last.start, last.end);
        } else {
          merged.push({ ...iv });
        }
      }
    }

    let slices = [];
    let curr = 0;
    for (let iv of merged) {
      if (iv.start > curr) {
        slices.push({ text: text.substring(curr, iv.start), isHighlight: false });
      }
      slices.push({ text: text.substring(iv.start, iv.end), isHighlight: true });
      curr = iv.end;
    }
    if (curr < text.length) {
      slices.push({ text: text.substring(curr), isHighlight: false });
    }

    return slices;
  }, [passage.jp_text, highlights]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
      {/* Top Action Bar: Navigation & Quick Status & Stopwatch */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        
        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95"
            title="Bài trước (Phím ←)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Trước</span>
          </button>

          <span className="px-3 py-1.5 text-xs font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/60 rounded-xl tabular-nums">
            Bài {passage.id} / {totalCount}
          </span>

          <button
            onClick={onNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95"
            title="Bài sau (Phím →)"
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onRandom}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/70 hover:text-amber-700 dark:hover:text-amber-300 text-slate-600 dark:text-slate-300 transition-all ml-0.5 active:scale-95"
            title="Bài đọc ngẫu nhiên"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Stopwatch */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono">
          <Clock className={`w-4 h-4 ${isTimerRunning ? 'text-amber-600 dark:text-amber-400 animate-spin' : 'text-slate-400'}`} />
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm tabular-nums">{formatTime(seconds)}</span>
          <button
            onClick={toggleTimer}
            className={`p-1 rounded-md transition-colors ${
              isTimerRunning 
                ? 'bg-amber-500 text-white' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title={isTimerRunning ? 'Tạm dừng bấm giờ' : 'Bắt đầu bấm giờ đọc'}
          >
            {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={resetTimer}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Đặt lại đồng hồ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status markers: Đã đọc trôi chảy / Cần luyện thêm */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStatusChange(passage.id, status === 'review' ? 'unseen' : 'review')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
              status === 'review'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Cần luyện thêm</span>
          </button>

          <button
            onClick={() => onStatusChange(passage.id, status === 'mastered' ? 'unseen' : 'mastered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
              status === 'mastered'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã trôi chảy</span>
          </button>
        </div>
      </div>

      {/* Main Reading Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Card Header: Group & Title */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-50/90 via-amber-50/40 to-slate-50/90 dark:from-slate-900 dark:via-amber-950/25 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg shadow-xs">
              {passage.group}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {passage.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 border border-amber-200/60 dark:border-amber-800/50">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Đọc thành tiếng &amp; Trả lời câu hỏi</span>
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-8 space-y-6">
          
          {/* Main Reading Passage Text Box (Warm paper canvas) */}
          <div className="bg-[#fffdf7] dark:bg-slate-800/60 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-amber-800/40 shadow-xs relative">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-5 border-b border-amber-200/60 dark:border-slate-700 text-xs text-amber-900/80 dark:text-amber-200 font-semibold">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Đề bài đọc tiếng Nhật (Chế độ thi):
              </span>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-amber-200/80 dark:border-slate-700 shadow-2xs">
                <button
                  onClick={() => setToolMode('cursor')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    toolMode === 'cursor'
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Chế độ Con trỏ: Bôi đen văn bản bình thường để copy"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>Con trỏ</span>
                </button>

                <button
                  onClick={() => setToolMode(toolMode === 'highlighter' ? 'cursor' : 'highlighter')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    toolMode === 'highlighter'
                      ? 'bg-rose-500 text-white shadow-2xs ring-2 ring-rose-300 dark:ring-rose-800'
                      : 'text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                  }`}
                  title="Chế độ Bút bôi: Quét chuột qua chữ để đánh dấu màu hồng"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span>Bút bôi</span>
                </button>

                <button
                  onClick={() => setToolMode(toolMode === 'eraser' ? 'cursor' : 'eraser')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    toolMode === 'eraser'
                      ? 'bg-amber-500 text-white shadow-2xs ring-2 ring-amber-300 dark:ring-amber-800'
                      : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                  }`}
                  title="Chế độ Tẩy: Click vào chữ đã bôi để xóa vết bôi"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Tẩy</span>
                </button>

                {highlights.length > 0 && (
                  <button
                    onClick={handleClearAllHighlights}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors ml-0.5"
                    title="Xóa toàn bộ vết bôi trong bài này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Paragraph Text */}
            <div 
              onMouseUp={handleTextSelection}
              onTouchEnd={handleTextSelection}
              className={`text-lg sm:text-xl md:text-2xl font-medium leading-[2.45] text-slate-900 dark:text-slate-100 tracking-wide font-japanese select-text ${
                toolMode === 'eraser' ? 'cursor-crosshair' : 'cursor-text'
              }`}
            >
              {textSlices.map((slice, index) => {
                if (slice.isHighlight) {
                  return (
                    <mark
                      key={index}
                      onClick={() => handleHighlightClick(slice.text)}
                      className={`bg-rose-200/85 dark:bg-rose-500/35 text-rose-950 dark:text-rose-100 rounded px-0.5 transition-colors ${
                        toolMode === 'eraser' 
                          ? 'cursor-crosshair hover:bg-rose-400 hover:line-through' 
                          : 'cursor-text'
                      }`}
                      title={toolMode === 'eraser' ? 'Bấm để xóa vết bôi này' : 'Từ đã bôi'}
                    >
                      {renderJapaneseWithFurigana(slice.text, showFurigana)}
                    </mark>
                  );
                }
                return (
                  <React.Fragment key={index}>
                    {renderJapaneseWithFurigana(slice.text, showFurigana)}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 text-right italic">
              {toolMode === 'cursor' && 'Chế độ Con trỏ: Kéo bôi đen văn bản để copy (Ctrl + C) • Bấm Bút bôi để đánh dấu'}
              {toolMode === 'highlighter' && 'Chế độ Bút bôi: Kéo chuột để đánh dấu màu hồng • Bấm lại nút Bút bôi để về Con trỏ'}
              {toolMode === 'eraser' && 'Chế độ Tẩy: Click vào chữ đã bôi để xóa'}
            </div>
          </div>

          {/* Action Bar under Passage */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSpeakPassage}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all ${
                  speech.isSpeaking && speech.currentText === passage.jp_text
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
                title="Nghe máy đọc mẫu đoạn văn (Phím Space)"
              >
                {speech.isSpeaking && speech.currentText === passage.jp_text ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>Dừng đọc</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Nghe đọc mẫu ({speed}x)</span>
                  </>
                )}
              </button>

              {setSpeed && (
                <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  {[0.5, 0.75, 1.0, 1.25].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                        speed === s
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={`Tốc độ đọc ${s}x`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowHighlightedWords(!showHighlightedWords)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  showHighlightedWords
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : processedHighlightedItems.length > 0
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800 hover:bg-rose-100 font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-70'
                }`}
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span>Từ đã bôi ({processedHighlightedItems.length})</span>
              </button>

              <button
                onClick={() => setShowViText(!showViText)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showViText
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showViText ? 'Ẩn dịch' : 'Hiện dịch nghĩa'}</span>
              </button>

              <button
                onClick={() => setShowKanjiCheck(!showKanjiCheck)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  showKanjiCheck
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800/60 hover:bg-purple-100'
                }`}
              >
                <span>{showKanjiCheck ? 'Ẩn Kanji' : `Kanji Bài 8–11 (${passage.kanji_check?.length || 0})`}</span>
              </button>

              <button
                onClick={() => setShowQuestions(!showQuestions)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  showQuestions
                    ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 hover:bg-amber-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showQuestions ? 'Ẩn câu hỏi' : 'Giám khảo hỏi'}</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* KHU VỰC: KIỂM TRA TỪ ĐÃ BÔI (2 TẦNG: TÀI LIỆU TRƯỚC - AI SAU) */}
          {/* ========================================================= */}
          {showHighlightedWords && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-50/70 via-indigo-50/30 to-slate-50 dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900 border border-rose-200/80 dark:border-rose-900/50 space-y-4 animate-fadeIn shadow-xs">
              
              {/* Header của khu vực kiểm tra */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/70 dark:border-rose-900/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500 text-white shadow-xs">
                    <Highlighter className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                      Kiểm tra cách đọc &amp; Dịch nghĩa các từ đã bôi
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Nguyên tắc: <b>Ưu tiên tra cứu tài liệu trước</b> • Từ/câu ngoài tài liệu dùng <b>Trợ lý AI</b>
                    </p>
                  </div>
                </div>

                {/* Các nút tác vụ đầu bảng */}
                <div className="flex flex-wrap items-center gap-2">
                  {unTranslatedCount > 0 && (
                    <button
                      onClick={handleTranslateAllExternal}
                      disabled={isTranslatingAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                      title="Gửi tất cả các từ ngoài giáo trình đến AI để dịch cùng lúc"
                    >
                      {isTranslatingAll ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang dịch...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Dịch tất cả từ ngoài tài liệu ({unTranslatedCount})</span>
                        </>
                      )}
                    </button>
                  )}

                  {highlights.length > 0 && (
                    <button
                      onClick={handleClearAllHighlights}
                      className="px-2.5 py-1 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 rounded-xl border border-rose-200/80 dark:border-rose-800/60 transition-colors flex items-center gap-1"
                      title="Xóa hết toàn bộ vết bôi đánh dấu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa hết bôi</span>
                    </button>
                  )}
                </div>
              </div>

              {aiError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-center justify-between gap-2">
                  <span>{aiError}</span>
                  {onOpenAiSettings && (
                    <button 
                      onClick={onOpenAiSettings}
                      className="font-bold underline text-indigo-600 dark:text-indigo-400 shrink-0"
                    >
                      Cài đặt AI
                    </button>
                  )}
                </div>
              )}

              {processedHighlightedItems.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm space-y-1.5 bg-white/60 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-700 dark:text-slate-200">Bạn chưa bôi đen từ nào trong bài đọc này.</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                    Bấm nút &ldquo;Bút bôi&rdquo; rồi kéo chuột qua bất kỳ từ nào trong bài đọc để tra cứu và dịch ngay!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {processedHighlightedItems.map((item, idx) => {
                    const isSavedFlashcard = savedFlashcards.has(item.cleanWord);

                    return (
                      <div 
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-start space-y-2.5 bg-white dark:bg-slate-800/90 shadow-2xs ${
                          item.isLocal 
                            ? 'border-emerald-200 dark:border-emerald-800/70 hover:border-emerald-300' 
                            : 'border-amber-200 dark:border-amber-800/70 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {item.isLocal ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 truncate">
                              Trong tài liệu
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              Ngoài tài liệu
                            </span>
                          )}

                          <button
                            onClick={() => handleRememberWord(item.rawText)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition-colors shrink-0"
                            title="Xóa vết bôi của từ này khi đã thuộc"
                          >
                            <Check className="w-3 h-3" />
                            <span>Đã nhớ</span>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-japanese tracking-wide">
                              {item.cleanWord}
                            </span>
                            <button
                              onClick={() => speech.speak(item.reading || item.aiData?.reading || item.cleanWord, speed)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>

                          {item.isLocal && item.isKanji && (
                            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-700 text-xs">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.han_viet && (
                                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold rounded-md text-[11px] border border-indigo-100 dark:border-indigo-800">
                                    Hán Việt: {item.han_viet}
                                  </span>
                                )}
                                {item.lesson && (
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-md text-[10px]">
                                    Bài {item.lesson}
                                  </span>
                                )}
                              </div>

                              <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
                                {item.kun_reading && item.kun_reading !== '—' && (
                                  <p className="text-[11px]">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">Âm Kun:</span>{' '}
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-japanese">{item.kun_reading}</span>
                                  </p>
                                )}
                                {item.on_reading && item.on_reading !== '—' && (
                                  <p className="text-[11px]">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">Âm On:</span>{' '}
                                    <span className="font-bold text-amber-700 dark:text-amber-400 font-japanese">{item.on_reading}</span>
                                  </p>
                                )}
                                <p className="text-xs font-bold text-slate-900 dark:text-white pt-0.5">
                                  <span className="font-semibold text-slate-500 dark:text-slate-400">Nghĩa:</span> {item.meaning}
                                </p>
                              </div>

                              {item.examples && item.examples.length > 0 && (
                                <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
                                  <p className="text-[10px] font-semibold text-slate-400 mb-1">Ví dụ liên quan:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {item.examples.slice(0, 4).map((ex, eIdx) => (
                                      <span 
                                        key={eIdx}
                                        className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded text-[10px] text-slate-700 dark:text-slate-200 font-japanese"
                                        title={`${ex.word} (${ex.reading}): ${ex.meaning || item.meaning}`}
                                      >
                                        <span className="font-bold">{ex.word}</span>
                                        {ex.reading && ex.reading !== ex.word && <span className="text-slate-500 dark:text-slate-400 ml-0.5">({ex.reading})</span>}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {item.isLocal && !item.isKanji && (
                            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-japanese">
                                  Cách đọc: {item.reading}
                                </p>
                                {item.han_viet && (
                                  <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded font-semibold text-[10px]">
                                    {item.han_viet}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug">
                                {item.meaning}
                              </p>
                            </div>
                          )}

                          {!item.isLocal && !item.aiData && (
                            <div className="pt-1.5">
                              <button
                                onClick={() => handleTranslateSingleItem(item.cleanWord)}
                                disabled={item.isTranslating}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                              >
                                {item.isTranslating ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>AI đang dịch...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                    <span>Dịch &amp; Phân tích bằng AI</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {!item.isLocal && item.aiData && (
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700 text-xs animate-fadeIn">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-indigo-600 dark:text-indigo-400 font-japanese">
                                  {item.aiData.reading}
                                </p>
                                {item.aiData.han_viet && (
                                  <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded font-semibold text-[10px]">
                                    {item.aiData.han_viet}
                                  </span>
                                )}
                              </div>

                              <p className="font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                {item.aiData.meaning_vi}
                              </p>

                              {item.aiData.grammar_notes && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/70 p-2 rounded-xl border border-slate-100 dark:border-slate-700 leading-relaxed">
                                  {item.aiData.grammar_notes}
                                </p>
                              )}

                              <div className="pt-1 flex justify-end">
                                <button
                                  onClick={() => handleSaveToFlashcard(item.cleanWord, item.aiData)}
                                  disabled={isSavedFlashcard}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    isSavedFlashcard
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                  }`}
                                >
                                  {isSavedFlashcard ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Đã lưu vào Flashcard</span>
                                    </>
                                  ) : (
                                    <>
                                      <BookmarkPlus className="w-3 h-3" />
                                      <span>+ Lưu vào Flashcard</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {showViText && (
            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/35 border border-indigo-200 dark:border-indigo-800/60 space-y-2 animate-fadeIn">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">
                Bản dịch đối chiếu:
              </span>
              <p className="text-sm sm:text-base text-indigo-950 dark:text-indigo-100 leading-relaxed font-sans">
                {passage.vi_text}
              </p>
            </div>
          )}

          {showKanjiCheck && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-purple-50/50 dark:from-purple-950/30 dark:via-slate-900 dark:to-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3.5 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/60 dark:border-purple-800/50 pb-2.5">
                <div>
                  <h3 className="font-bold text-purple-950 dark:text-purple-200 text-sm sm:text-base leading-tight">
                    Kiểm tra cách đọc chữ Hán Bài 8 – Bài 11
                  </h3>
                  <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                    Có <b>{passage.kanji_check?.length || 0} từ</b> trong bài đọc này không có Furigana
                  </p>
                </div>
                <span className="text-xs text-purple-700 dark:text-purple-300 font-medium hidden sm:inline">
                  Bấm biểu tượng loa để nghe phát âm từng từ
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {passage.kanji_check?.map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-white dark:bg-slate-800/90 p-3 rounded-2xl border border-purple-100 dark:border-slate-700 shadow-2xs hover:shadow-xs hover:border-purple-300 dark:hover:border-purple-600 transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.lesson === 'Bài 8' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' :
                        item.lesson === 'Bài 9' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                        item.lesson === 'Bài 10' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' :
                        'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}>
                        {item.lesson}
                      </span>
                      <button
                        onClick={() => speech.speak(item.reading || item.word, speed)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60 transition-colors"
                        title="Nghe phát âm từ này"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-japanese tracking-wide">
                        {item.word}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 font-mono mt-0.5">
                        {item.reading}
                      </div>
                    </div>

                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate border-t border-slate-100 dark:border-slate-700 pt-1.5" title={item.meaning}>
                      {item.meaning}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showQuestions && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Câu hỏi đọc hiểu ({passage.questions.length} câu)
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                  *Tự trả lời thành tiếng trước khi xem gợi ý
                </span>
              </div>

              <div className="space-y-3">
                {passage.questions.map((q, idx) => {
                  const isRevealed = revealedAnswers[idx];

                  return (
                    <div 
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleSpeakQuestion(q.q_jp)}
                          className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors shrink-0"
                          title="Nghe câu hỏi"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        <div className="flex-1 space-y-1">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">
                            Câu hỏi {idx + 1}:
                          </span>

                          <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed font-japanese">
                            {renderJapaneseWithFurigana(q.q_jp, showFurigana)}
                          </div>
                        </div>

                        <button
                          onClick={() => toggleRevealAnswer(idx)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                            isRevealed
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span>{isRevealed ? 'Ẩn đáp án' : 'Xem đáp án'}</span>
                          {isRevealed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isRevealed && (
                        <div className="sm:ml-11 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 animate-fadeIn">
                          <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                            <b>Dịch câu hỏi:</b> {q.q_vi}
                          </div>

                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/35 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
                            <button
                              onClick={() => handleSpeakAnswer(q.a_jp)}
                              className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors shrink-0"
                              title="Nghe câu trả lời mẫu"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 block">
                                → Gợi ý trả lời:
                              </span>
                              <div className="text-sm sm:text-base font-medium text-emerald-950 dark:text-emerald-100 font-japanese">
                                {renderJapaneseWithFurigana(q.a_jp, showFurigana)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
