import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Volume2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Trophy,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  BookOpen,
  Shuffle,
  Award,
  Headphones,
} from 'lucide-react';
import { renderJapaneseWithFurigana } from '../utils/japanese';

export default function MockTestModal({
  imageQuestions,
  noImageQuestions,
  readingPassages,
  onClose,
  speech,
  speed,
  setSpeed,
  showFurigana,
  onUpdateImageStatus,
  onUpdateNoImageStatus,
  onUpdateReadingStatus,
}) {
  const [examMode, setExamMode] = useState('full');
  const [testSize, setTestSize] = useState(5);
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [testState, setTestState] = useState('setup');

  const [testQuestions, setTestQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showQuestionText, setShowQuestionText] = useState(false);
  const [results, setResults] = useState({});

  const timerRef = useRef(null);

  const handleStartTest = () => {
    let poolImage = imageQuestions.map((q) => ({ ...q, type: 'image', uniqueKey: `img_${q.id}` }));
    let poolNoImage = noImageQuestions.map((q) => ({
      ...q,
      type: 'no-image',
      uniqueKey: `noimg_${q.id}`,
    }));
    let poolReading = (readingPassages || []).map((p) => ({
      ...p,
      type: 'reading',
      uniqueKey: `read_${p.id}`,
    }));

    if (selectedLesson !== 'all') {
      const lessonNum = Number(selectedLesson);
      poolImage = poolImage.filter((q) => q.lesson === lessonNum);
      poolNoImage = poolNoImage.filter((q) => q.lesson === lessonNum);
    }

    const shuffleArray = (arr) => [...arr].sort(() => Math.random() - 0.5);

    let selected = [];

    if (examMode === 'full') {
      const pickedReading = shuffleArray(poolReading).slice(0, 1);
      const pickedImgs = shuffleArray(poolImage).slice(0, 2);
      const pickedNoImgs = shuffleArray(poolNoImage).slice(0, 2);
      selected = [...pickedReading, ...pickedImgs, ...pickedNoImgs];
    } else if (examMode === 'image') {
      selected = shuffleArray(poolImage).slice(0, Math.min(testSize, poolImage.length));
    } else if (examMode === 'no-image') {
      selected = shuffleArray(poolNoImage).slice(0, Math.min(testSize, poolNoImage.length));
    } else if (examMode === 'reading') {
      selected = shuffleArray(poolReading).slice(0, Math.min(testSize, poolReading.length));
    } else {
      const halfSize = Math.floor(testSize / 2);
      const imgCount = halfSize;
      const noImgCount = testSize - halfSize;
      const pickedImgs = shuffleArray(poolImage).slice(0, imgCount);
      const pickedNoImgs = shuffleArray(poolNoImage).slice(0, noImgCount);
      selected = shuffleArray([...pickedImgs, ...pickedNoImgs]);
    }

    if (selected.length === 0) {
      alert('Không có câu hỏi nào phù hợp với bộ lọc đã chọn.');
      return;
    }

    setTestQuestions(selected);
    setCurrentIndex(0);
    setResults({});
    setTimeLeft(selected[0].type === 'reading' ? 60 : 30);
    setIsTimerPaused(false);
    setShowAnswer(false);
    setShowQuestionText(false);
    setTestState('running');
  };

  const currentQ = testQuestions[currentIndex];

  useEffect(() => {
    if (testState === 'running' && currentQ) {
      const t = setTimeout(() => {
        let textToSpeak = '';
        if (currentQ.type === 'image') {
          textToSpeak = currentQ.qa.map((item) => item.q_jp).join(' ... ');
          speech.speak(textToSpeak, speed);
        } else if (currentQ.type === 'no-image') {
          textToSpeak = currentQ.q_jp;
          speech.speak(textToSpeak, speed);
        } else if (currentQ.type === 'reading') {
          if (currentQ.questions && currentQ.questions.length > 0) {
            textToSpeak = currentQ.questions.map((q) => q.q_jp).join(' ... ');
            speech.speak(textToSpeak, speed);
          }
        }
      }, 500);

      return () => clearTimeout(t);
    }
  }, [currentIndex, testState, currentQ, speed, speech]);

  useEffect(() => {
    if (testState !== 'running' || isTimerPaused) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [testState, currentIndex, isTimerPaused]);

  useEffect(() => {
    return () => {
      speech.stop();
    };
  }, [speech]);

  const handleNextQuestion = (statusForCurrent) => {
    speech.stop();
    const updatedResults = {
      ...results,
      [currentQ.uniqueKey]: statusForCurrent || 'review',
    };
    setResults(updatedResults);

    if (statusForCurrent) {
      if (currentQ.type === 'image' && onUpdateImageStatus) {
        onUpdateImageStatus(currentQ.id, statusForCurrent);
      } else if (currentQ.type === 'no-image' && onUpdateNoImageStatus) {
        onUpdateNoImageStatus(currentQ.id, statusForCurrent);
      } else if (currentQ.type === 'reading' && onUpdateReadingStatus) {
        onUpdateReadingStatus(currentQ.id, statusForCurrent);
      }
    }

    if (currentIndex + 1 < testQuestions.length) {
      const nextQ = testQuestions[currentIndex + 1];
      setTimeLeft(nextQ?.type === 'reading' ? 60 : 30);
      setShowAnswer(false);
      setShowQuestionText(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setTestState('finished');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  if (testState === 'setup') {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-rose-500/20">
            <Trophy className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Thi Thử Vấn Đáp JPD133
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Mô phỏng chân thực quy trình thi vấn đáp môn JPD133: Tự động bấm giờ, phát âm câu hỏi ngẫu nhiên và rèn luyện phản xạ trước giám khảo.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            1. Chọn hình thức thi
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => {
                setExamMode('full');
                setTestSize(5);
              }}
              className={`p-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 col-span-2 sm:col-span-1 ${
                examMode === 'full'
                  ? 'bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white border-transparent shadow-sm ring-2 ring-rose-300 dark:ring-rose-800'
                  : 'bg-rose-50/70 dark:bg-rose-950/35 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40'
              }`}
            >
              <Award className="w-5 h-5" />
              <span>Chuẩn thi thật</span>
              <span className="text-[10px] opacity-90 font-normal">Đọc + Hình + Phản xạ</span>
            </button>

            <button
              onClick={() => {
                setExamMode('mixed');
                setTestSize(6);
              }}
              className={`p-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                examMode === 'mixed'
                  ? 'bg-indigo-600 text-white border-transparent shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Shuffle className="w-5 h-5" />
              <span>Trộn 2 phần</span>
              <span className="text-[10px] opacity-80 font-normal">Có hình + Phản xạ</span>
            </button>

            <button
              onClick={() => {
                setExamMode('reading');
                setTestSize(3);
              }}
              className={`p-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                examMode === 'reading'
                  ? 'bg-amber-600 text-white border-transparent shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Chỉ Luyện đọc</span>
              <span className="text-[10px] opacity-80 font-normal">16 Bài đọc</span>
            </button>

            <button
              onClick={() => {
                setExamMode('image');
                setTestSize(5);
              }}
              className={`p-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                examMode === 'image'
                  ? 'bg-indigo-600 text-white border-transparent shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span>Chỉ Có hình</span>
              <span className="text-[10px] opacity-80 font-normal">102 Hình</span>
            </button>

            <button
              onClick={() => {
                setExamMode('no-image');
                setTestSize(5);
              }}
              className={`p-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                examMode === 'no-image'
                  ? 'bg-teal-600 text-white border-transparent shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chỉ Phản xạ</span>
              <span className="text-[10px] opacity-80 font-normal">39 Câu hỏi</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            2. Số lượng câu / Cấu trúc bài thi
          </label>
          {examMode === 'full' ? (
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/35 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Sparkles className="w-4 h-4" />
                Cấu trúc chuẩn phòng thi (5 phần):
              </div>
              <p>• <b>1 Bài đọc hiểu ngẫu nhiên</b> (đọc to 60s + trả lời câu hỏi giám khảo)</p>
              <p>• <b>2 Câu hỏi có hình minh họa</b> (nhìn tranh vấn đáp)</p>
              <p>• <b>2 Câu hỏi phản xạ không hình</b> (trả lời tình huống cá nhân)</p>
            </div>
          ) : examMode === 'mixed' ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { size: 6, label: '6 câu (3 Hình + 3 Phản xạ)' },
                { size: 8, label: '8 câu (4 Hình + 4 Phản xạ)' },
                { size: 10, label: '10 câu (5 Hình + 5 Phản xạ)' },
              ].map((item) => (
                <button
                  key={item.size}
                  onClick={() => setTestSize(item.size)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    testSize === item.size
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setTestSize(n)}
                  className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                    testSize === n
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {n} câu
                </button>
              ))}
            </div>
          )}
        </div>

        {examMode !== 'reading' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              3. Phạm vi bài học (Lesson)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: '8', label: 'Bài 8' },
                { id: '9', label: 'Bài 9' },
                { id: '10', label: 'Bài 10' },
                { id: '11', label: 'Bài 11' },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLesson(l.id)}
                  className={`py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                    selectedLesson === l.id
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {setSpeed && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              4. Tốc độ giọng đọc (Speed)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 0.75, 1.0, 1.25].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                    speed === s
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {s}x {s === 1.0 ? '(Chuẩn)' : s === 0.75 ? '(Vừa)' : s === 0.5 ? '(Chậm)' : '(Nhanh)'}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleStartTest}
          className="w-full py-3.5 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 text-white rounded-2xl font-bold text-base shadow-md shadow-rose-500/25 hover:brightness-105 transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Bắt đầu thi thử ngay</span>
        </button>
      </div>
    );
  }

  if (testState === 'finished') {
    const masteredCount = Object.values(results).filter((v) => v === 'mastered').length;
    const reviewCount = Object.values(results).filter((v) => v === 'review').length;

    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-6 text-center animate-fadeIn">
        <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center shadow-md">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Hoàn Thành Bài Thi Thử!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bạn đã phản xạ xong toàn bộ {testQuestions.length} phần thi vấn đáp.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-800 dark:text-emerald-300">
            <span className="text-2xl font-black block">{masteredCount}</span>
            <span className="text-xs font-semibold">Tự tin (Đã đạt)</span>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-800 dark:text-amber-300">
            <span className="text-2xl font-black block">{reviewCount}</span>
            <span className="text-xs font-semibold">Cần rèn luyện thêm</span>
          </div>
        </div>

        <div className="text-left space-y-2 pt-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Chi tiết kết quả từng phần:
          </h3>
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 space-y-1">
            {testQuestions.map((q, idx) => {
              const res = results[q.uniqueKey];
              const isReading = q.type === 'reading';
              const isImage = q.type === 'image';
              return (
                <div key={q.uniqueKey} className="p-2.5 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200">#{idx + 1}.</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                        isReading
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          : isImage
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                      }`}
                    >
                      {isReading ? `Bài đọc #${q.id}` : isImage ? `Hình ${q.id}` : `Phản xạ #${q.id}`}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 truncate">
                      {q.title || q.grammar}
                    </span>
                  </div>
                  {res === 'mastered' ? (
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-md shrink-0">
                      Đạt
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold rounded-md shrink-0">
                      Cần ôn
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setTestState('setup')}
            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Thi bài khác</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Trở về luyện tập</span>
          </button>
        </div>
      </div>
    );
  }

  const totalMaxTime = currentQ.type === 'reading' ? 60 : 30;
  const timerPercent = (timeLeft / totalMaxTime) * 100;
  const isUrgent = timeLeft <= 5;
  const isWarning = timeLeft <= 15 && timeLeft > 5;
  const isReadingQuestion = currentQ.type === 'reading';
  const isImageQuestion = currentQ.type === 'image';

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 bg-rose-500 text-white font-black text-xs rounded-xl shadow-xs">
            Phần {currentIndex + 1} / {testQuestions.length}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
              isReadingQuestion
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                : isImageQuestion
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
            }`}
          >
            {isReadingQuestion
              ? currentQ.title
              : isImageQuestion
                ? `Hình ${currentQ.id}`
                : `Phản xạ #${currentQ.id}`}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock
              className={`w-5 h-5 ${
                isUrgent
                  ? 'text-rose-500 animate-bounce'
                  : isWarning
                    ? 'text-amber-500'
                    : 'text-indigo-600 dark:text-indigo-400'
              }`}
            />
            <span
              className={`text-xl sm:text-2xl font-black font-mono tracking-tight tabular-nums ${
                isUrgent
                  ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                  : isWarning
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-800 dark:text-white'
              }`}
            >
              {timeLeft}s
            </span>
          </div>

          <button
            onClick={() => setIsTimerPaused(!isTimerPaused)}
            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
          >
            {isTimerPaused ? 'Tiếp tục' : 'Tạm dừng'}
          </button>
        </div>
      </div>

      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-5">
        {isReadingQuestion ? (
          <div className="space-y-4">
            <div className="bg-amber-50/40 dark:bg-slate-800/70 rounded-2xl p-5 sm:p-6 border border-amber-200/80 dark:border-amber-800/50">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Hãy đọc to đoạn văn tiếng Nhật sau:</span>
              </span>
              <div className="text-base sm:text-lg md:text-xl font-medium leading-loose text-slate-900 dark:text-slate-100 font-japanese">
                {renderJapaneseWithFurigana(currentQ.jp_text, showFurigana)}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase block">
                Câu hỏi đọc hiểu của giám khảo:
              </span>
              {currentQ.questions.map((q, i) => (
                <div key={i} className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 font-japanese">
                  {i + 1}. {renderJapaneseWithFurigana(q.q_jp, showFurigana)}
                </div>
              ))}
            </div>
          </div>
        ) : isImageQuestion ? (
          <div className="bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center min-h-[220px] sm:min-h-[280px]">
            <div className="bg-white rounded-xl p-2 shadow-sm">
              <img
                src={currentQ.image}
                alt={`Hình ${currentQ.id}`}
                className="max-h-[320px] w-auto max-w-full object-contain rounded-lg"
                decoding="async"
              />
            </div>
          </div>
        ) : (
          <div
            className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center min-h-[180px] sm:min-h-[220px] text-center space-y-3"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.2), transparent 55%)',
            }}
          >
            <span className="text-teal-300 text-xs font-semibold uppercase tracking-wider">
              Câu hỏi phản xạ trực tiếp • Bài {currentQ.lesson}
            </span>
            {showQuestionText ? (
              <h3 className="text-xl sm:text-2xl font-bold leading-relaxed text-white font-japanese">
                {renderJapaneseWithFurigana(currentQ.q_jp, showFurigana)}
              </h3>
            ) : (
              <div className="space-y-2 text-slate-300">
                <Headphones className="w-8 h-8 mx-auto text-teal-300" />
                <p className="text-slate-300 italic text-sm">
                  Nghe câu hỏi từ giảng viên và trả lời trong 30 giây...
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              let textToSpeak = '';
              if (isReadingQuestion) {
                textToSpeak = currentQ.questions.map((q) => q.q_jp).join(' ... ');
              } else if (isImageQuestion) {
                textToSpeak = currentQ.qa.map((item) => item.q_jp).join(' ... ');
              } else {
                textToSpeak = currentQ.q_jp;
              }
              speech.speak(textToSpeak, speed);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            <span>Nghe lại ({speed}x)</span>
          </button>

          <div className="flex items-center gap-2">
            {!isReadingQuestion && (
              <button
                onClick={() => setShowQuestionText(!showQuestionText)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {showQuestionText ? 'Ẩn câu hỏi' : 'Xem chữ câu hỏi'}
              </button>
            )}

            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
            >
              {showAnswer ? 'Ẩn đáp án' : 'Xem đáp án mẫu'}
            </button>
          </div>
        </div>

        {showQuestionText && !isReadingQuestion && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 animate-fadeIn">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
              Câu hỏi:
            </span>
            {isImageQuestion ? (
              currentQ.qa.map((qa, i) => (
                <div key={i} className="text-base font-medium text-slate-900 dark:text-slate-100 font-japanese">
                  {i + 1}. {renderJapaneseWithFurigana(qa.q_jp, showFurigana)}
                </div>
              ))
            ) : (
              <div className="text-base font-medium text-slate-900 dark:text-slate-100 font-japanese">
                {renderJapaneseWithFurigana(currentQ.q_jp, showFurigana)}
                <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5 font-sans">
                  {currentQ.q_vi}
                </div>
              </div>
            )}
          </div>
        )}

        {showAnswer && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/35 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2 animate-fadeIn">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase">
              Đáp án gợi ý:
            </span>
            {isReadingQuestion ? (
              currentQ.questions.map((q, i) => (
                <div key={i} className="text-sm sm:text-base font-medium text-emerald-950 dark:text-emerald-100 font-japanese">
                  → {renderJapaneseWithFurigana(q.a_jp, showFurigana)}
                </div>
              ))
            ) : isImageQuestion ? (
              currentQ.qa.map((qa, i) => (
                <div key={i} className="text-sm sm:text-base font-medium text-emerald-950 dark:text-emerald-100 font-japanese">
                  → {renderJapaneseWithFurigana(qa.a_jp, showFurigana)}
                  <div className="text-xs text-emerald-700 dark:text-emerald-300/90 italic font-sans">
                    {qa.a_vi}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm sm:text-base font-medium text-emerald-950 dark:text-emerald-100 font-japanese">
                → {renderJapaneseWithFurigana(currentQ.a_jp, showFurigana)}
                <div className="text-xs text-emerald-700 dark:text-emerald-300/90 italic mt-0.5 font-sans">
                  {currentQ.a_vi}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tự đánh giá phần trả lời của bạn:
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNextQuestion('review')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Chưa tự tin (Cần rèn thêm)</span>
            </button>

            <button
              onClick={() => handleNextQuestion('mastered')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Tự tin (Đã đạt)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
