import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen,
  RotateCw,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Award,
  RefreshCcw,
  HelpCircle,
  Eye,
  EyeOff,
  Filter,
  Check,
  X,
  Layers,
  RotateCcw,
  ArrowRight,
  Trophy,
  Trash2,
  Copy,
  Pencil,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import vocabData from '../data/vocabulary_b1_11.json';
import exercisesData from '../data/vocab_exercises.json';
import {
  getCustomVocab,
  removeCustomVocab,
  updateCustomVocabItem,
  getDeletedVocabIds,
  addDeletedVocabId,
  getEditedVocabMap,
  saveEditedVocabItem,
  removeEditedVocabItem,
} from '../utils/aiClient';

const VOCAB_STATUS_KEY = 'jpd133_vocab_status_v1';

function hashWithSeed(str, seed) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

function sortWithSeed(items, seed, getKey) {
  return [...items].sort((a, b) => {
    const keyA = String(getKey(a));
    const keyB = String(getKey(b));
    const hashA = hashWithSeed(keyA, seed);
    const hashB = hashWithSeed(keyB, seed);
    if (hashA !== hashB) return hashA - hashB;
    return keyA.localeCompare(keyB);
  });
}

function createRandomSeed() {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

export default function VocabPractice({ showFurigana, speech, speed, setSpeed }) {
  const [subMode, setSubMode] = useState('flashcard');
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReviewOnly, setFilterReviewOnly] = useState(false);
  const [customVocab, setCustomVocab] = useState(() => getCustomVocab());
  const [deletedIds, setDeletedIds] = useState(() => getDeletedVocabIds());
  const [editedMap, setEditedMap] = useState(() => getEditedVocabMap());
  const [editingWord, setEditingWord] = useState(null);
  const [editForm, setEditForm] = useState({
    word_jp: '',
    reading: '',
    han_viet: '',
    meaning_vi: '',
    topic: '',
    example_jp: '',
    example_vi: '',
  });
  const [shuffleNotice, setShuffleNotice] = useState('');

  const [vocabStatus, setVocabStatus] = useState(() => {
    try {
      const saved = localStorage.getItem(VOCAB_STATUS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(VOCAB_STATUS_KEY, JSON.stringify(vocabStatus));
    } catch (e) {
      console.error(e);
    }
  }, [vocabStatus]);

  // ==========================================
  // FLASHCARD STATE
  // ==========================================
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardShowFurigana, setCardShowFurigana] = useState(showFurigana);
  const [prevGlobalFurigana, setPrevGlobalFurigana] = useState(showFurigana);
  const [isFlashcardCompleted, setIsFlashcardCompleted] = useState(false);
  const [reviewSessionIds, setReviewSessionIds] = useState(null); // null | array of word ids
  const [shuffleSessionIds, setShuffleSessionIds] = useState(null); // null | array of untouched word ids
  const [shuffleSeed, setShuffleSeed] = useState(null); // null = thứ tự gốc | number = đã tráo thẻ
  const [cardAnimKey, setCardAnimKey] = useState(0);
  const [slideDirection, setSlideDirection] = useState('next');
  const [copiedKey, setCopiedKey] = useState(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyText = useCallback(async (text, key) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Ignore clipboard error
    }
  }, []);

  const handleCardFlipClick = () => {
    const selected = window.getSelection ? window.getSelection().toString().trim() : '';
    if (selected.length > 0) return;
    setIsFlipped((prev) => !prev);
  };

  if (showFurigana !== prevGlobalFurigana) {
    setPrevGlobalFurigana(showFurigana);
    setCardShowFurigana(showFurigana);
  }

  // Dữ liệu từ vựng gốc đã loại bỏ thẻ bị xóa và áp dụng các chỉnh sửa đã lưu
  const activeBaseVocab = useMemo(
    () =>
      vocabData
        .filter((item) => !deletedIds.has(item.id))
        .map((item) => (editedMap[item.id] ? { ...item, ...editedMap[item.id] } : item)),
    [deletedIds, editedMap]
  );

  // Phạm vi từ vựng gốc theo bài học & tìm kiếm (chưa lọc reviewSessionIds / shuffleSessionIds / filterReviewOnly)
  const baseScopeVocab = useMemo(() => {
    let list = activeBaseVocab;

    if (selectedLesson === 'custom') {
      list = customVocab;
    } else if (selectedLesson === 'all') {
      list = customVocab.length > 0 ? [...customVocab, ...activeBaseVocab] : activeBaseVocab;
    } else {
      const lessonNum = Number(selectedLesson);
      list = list.filter((item) => item.lesson === lessonNum);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.word_jp && item.word_jp.toLowerCase().includes(q)) ||
          (item.reading && item.reading.toLowerCase().includes(q)) ||
          (item.meaning_vi && item.meaning_vi.toLowerCase().includes(q)) ||
          (item.han_viet && item.han_viet.toLowerCase().includes(q)) ||
          (item.topic && item.topic.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeBaseVocab, selectedLesson, searchQuery, customVocab]);

  const activeReviewStatus =
    filterReviewOnly && !reviewSessionIds && !shuffleSessionIds ? vocabStatus : null;

  const filteredVocab = useMemo(() => {
    let list = baseScopeVocab;

    if (reviewSessionIds) {
      const idSet = new Set(reviewSessionIds);
      const mapById = new Map(baseScopeVocab.map((item) => [item.id, item]));
      list = reviewSessionIds
        .map((id) => mapById.get(id))
        .filter((item) => item && idSet.has(item.id));
    } else if (shuffleSessionIds) {
      const idSet = new Set(shuffleSessionIds);
      const mapById = new Map(baseScopeVocab.map((item) => [item.id, item]));
      list = shuffleSessionIds
        .map((id) => mapById.get(id))
        .filter((item) => item && idSet.has(item.id));
    } else if (activeReviewStatus) {
      list = baseScopeVocab.filter((item) => activeReviewStatus[item.id] === 'review');
    }

    if (shuffleSeed !== null) {
      return sortWithSeed(list, shuffleSeed, (item) => item.id);
    }

    return list;
  }, [baseScopeVocab, reviewSessionIds, shuffleSessionIds, activeReviewStatus, shuffleSeed]);

  const safeIndex =
    filteredVocab.length === 0 ? 0 : Math.min(currentIndex, filteredVocab.length - 1);
  const currentWord = filteredVocab[safeIndex] || null;

  // Thống kê của phạm vi đang học (để hiển thị chính xác ở trang tổng kết & thanh trên)
  const scopeStats = useMemo(() => {
    let mastered = 0;
    let review = 0;
    const unmasteredList = [];
    const reviewOnlyList = [];

    for (const item of baseScopeVocab) {
      const st = vocabStatus[item.id];
      if (st === 'mastered') {
        mastered++;
      } else {
        if (st === 'review') {
          review++;
          reviewOnlyList.push(item);
        }
        unmasteredList.push(item);
      }
    }

    // Ưu tiên các từ đánh dấu "Cần ôn lại" lên đầu danh sách ôn tập
    const unseenList = unmasteredList.filter((item) => vocabStatus[item.id] !== 'review');
    const orderedUnmastered = [...reviewOnlyList, ...unseenList];

    return {
      total: baseScopeVocab.length,
      mastered,
      review,
      unseen: unseenList.length,
      unmasteredList: orderedUnmastered,
    };
  }, [baseScopeVocab, vocabStatus]);

  const triggerCardTransition = useCallback((direction) => {
    setSlideDirection(direction);
    setCardAnimKey((k) => k + 1);
    setIsFlipped(false);
  }, []);

  const handleNextCard = useCallback(() => {
    if (filteredVocab.length === 0) return;
    triggerCardTransition('next');
    setCurrentIndex((prev) => (prev + 1) % filteredVocab.length);
  }, [filteredVocab.length, triggerCardTransition]);

  const handlePrevCard = useCallback(() => {
    if (filteredVocab.length === 0) return;
    triggerCardTransition('prev');
    setCurrentIndex((prev) => (prev - 1 + filteredVocab.length) % filteredVocab.length);
  }, [filteredVocab.length, triggerCardTransition]);

  // Tráo ngẫu nhiên:
  // - Nếu đang ở vòng ôn từ chưa thuộc: tráo trong vòng ôn đó
  // - Ngược lại: CHỈ lấy những thẻ CHƯA CÓ THAO TÁC GÌ (!vocabStatus[id]) để tráo (bỏ qua Đã nhớ / Cần ôn lại)
  const handleShuffleDeck = () => {
    setShuffleNotice('');

    if (reviewSessionIds) {
      if (filteredVocab.length <= 1) return;
      setShuffleSeed(createRandomSeed());
      setCurrentIndex(0);
      setIsFlashcardCompleted(false);
      triggerCardTransition('next');
      return;
    }

    const untouchedIds = baseScopeVocab
      .filter((item) => !vocabStatus[item.id])
      .map((item) => item.id);

    if (untouchedIds.length === 0) {
      setShuffleNotice(
        'Tất cả các từ trong phần này đều đã được đánh dấu (Đã nhớ hoặc Cần ôn lại), không còn từ chưa thao tác để tráo.'
      );
      return;
    }

    setFilterReviewOnly(false);
    setShuffleSessionIds(untouchedIds);
    setShuffleSeed(createRandomSeed());
    setCurrentIndex(0);
    setIsFlashcardCompleted(false);
    triggerCardTransition('next');
  };

  // Khôi phục toàn bộ danh sách theo thứ tự gốc của giáo trình
  const handleResetOrder = () => {
    setShuffleNotice('');
    setShuffleSessionIds(null);
    setShuffleSeed(null);
    setCurrentIndex(0);
    triggerCardTransition('prev');
  };

  // Xóa vĩnh viễn 1 thẻ khỏi dữ liệu (không còn xuất hiện lại sau khi tải lại)
  const handleDeleteCard = useCallback(
    (word) => {
      if (!word) return;
      if (
        !window.confirm(
          `Xóa vĩnh viễn thẻ "${word.word_jp}" (${word.meaning_vi})?\nThẻ này sẽ không còn trong dữ liệu nữa.`
        )
      ) {
        return;
      }

      const isCustom =
        String(word.id).startsWith('custom_') ||
        customVocab.some((item) => item.id === word.id);

      if (isCustom) {
        setCustomVocab(removeCustomVocab(word.id));
      } else {
        setDeletedIds(addDeletedVocabId(word.id));
      }

      setVocabStatus((prev) => {
        if (!(word.id in prev)) return prev;
        const copy = { ...prev };
        delete copy[word.id];
        return copy;
      });

      if (reviewSessionIds) {
        const nextReview = reviewSessionIds.filter((id) => id !== word.id);
        setReviewSessionIds(nextReview.length > 0 ? nextReview : null);
        if (nextReview.length === 0) {
          setIsFlashcardCompleted(true);
        }
      }

      if (shuffleSessionIds) {
        const nextShuffle = shuffleSessionIds.filter((id) => id !== word.id);
        setShuffleSessionIds(nextShuffle.length > 0 ? nextShuffle : null);
        if (nextShuffle.length === 0) {
          setShuffleSeed(null);
          setIsFlashcardCompleted(true);
        }
      }

      const nextLen = filteredVocab.length - 1;
      if (nextLen > 0) {
        setCurrentIndex((prev) => Math.min(prev, nextLen - 1));
        triggerCardTransition('next');
      } else {
        setCurrentIndex(0);
      }
    },
    [
      customVocab,
      reviewSessionIds,
      shuffleSessionIds,
      filteredVocab.length,
      triggerCardTransition,
    ]
  );

  // Mở modal chỉnh sửa thẻ hiện tại
  const handleOpenEditModal = useCallback((word) => {
    if (!word) return;
    setEditingWord(word);
    setEditForm({
      word_jp: word.word_jp || '',
      reading: word.reading || '',
      han_viet: word.han_viet || '',
      meaning_vi: word.meaning_vi || '',
      topic: word.topic || '',
      example_jp: word.example_jp || '',
      example_vi: word.example_vi || '',
    });
  }, []);

  const handleSaveEditCard = (e) => {
    e.preventDefault();
    if (!editingWord) return;
    const trimmedWord = editForm.word_jp.trim();
    const trimmedMeaning = editForm.meaning_vi.trim();
    if (!trimmedWord || !trimmedMeaning) return;

    const patch = {
      word_jp: trimmedWord,
      reading: editForm.reading.trim() || trimmedWord,
      han_viet: editForm.han_viet.trim(),
      meaning_vi: trimmedMeaning,
      topic: editForm.topic.trim(),
      example_jp: editForm.example_jp.trim(),
      example_vi: editForm.example_vi.trim(),
    };

    const isCustom =
      String(editingWord.id).startsWith('custom_') ||
      customVocab.some((item) => item.id === editingWord.id);

    if (isCustom) {
      setCustomVocab(updateCustomVocabItem(editingWord.id, patch));
    } else {
      setEditedMap(saveEditedVocabItem(editingWord.id, patch));
    }

    setEditingWord(null);
  };

  const handleRestoreDefaultCard = () => {
    if (!editingWord) return;
    setEditedMap(removeEditedVocabItem(editingWord.id));
    setEditingWord(null);
  };

  // Đánh dấu "Đã nhớ" / "Cần ôn lại" -> Ghi nhớ trạng thái + Tự động lướt sang thẻ tiếp theo (hoặc sang trang Tổng kết nếu hết bài)
  const handleMarkAndAdvance = useCallback(
    (wordId, newStatus) => {
      if (!wordId) return;

      const updatedStatus = {
        ...vocabStatus,
        [wordId]: newStatus,
      };
      setVocabStatus(updatedStatus);
      setIsFlipped(false);

      // Trường hợp đang bật filterReviewOnly trực tiếp (ngoài reviewSessionIds) và vừa bấm "Đã nhớ"
      if (filterReviewOnly && !reviewSessionIds && newStatus === 'mastered') {
        const remainingCount = filteredVocab.length - 1;
        if (remainingCount <= 0 || safeIndex >= remainingCount) {
          setFilterReviewOnly(false);
          setIsFlashcardCompleted(true);
          if (remainingCount <= 0) {
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          }
          return;
        }
        // Phần tử kế tiếp tự động dồn lên đúng vị trí safeIndex
        triggerCardTransition('next');
        setCurrentIndex(safeIndex);
        return;
      }

      if (safeIndex + 1 < filteredVocab.length) {
        triggerCardTransition('next');
        setCurrentIndex(safeIndex + 1);
      } else {
        // Đã học hết thẻ cuối cùng -> Mở màn hình tổng kết & gợi ý ôn lại từ chưa thuộc
        setIsFlashcardCompleted(true);
        const remainingNotMastered = baseScopeVocab.filter(
          (item) => updatedStatus[item.id] !== 'mastered'
        );
        if (remainingNotMastered.length === 0 && baseScopeVocab.length > 0) {
          confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } });
        }
      }
    },
    [
      vocabStatus,
      filterReviewOnly,
      reviewSessionIds,
      filteredVocab.length,
      safeIndex,
      triggerCardTransition,
      baseScopeVocab,
    ]
  );

  // Bắt đầu vòng ôn lại các từ chưa thuộc (tùy chọn tráo ngẫu nhiên luôn)
  const handleStartReviewUnmastered = (shouldShuffle = false) => {
    const ids = scopeStats.unmasteredList.map((item) => item.id);
    if (ids.length === 0) return;
    setShuffleNotice('');
    setFilterReviewOnly(false);
    setShuffleSessionIds(null);
    setReviewSessionIds(ids);
    if (shouldShuffle) {
      setShuffleSeed(createRandomSeed());
    } else {
      setShuffleSeed(null);
    }
    setIsFlashcardCompleted(false);
    setCurrentIndex(0);
    triggerCardTransition('next');
  };

  // Học lại toàn bộ danh sách hiện tại từ đầu
  const handleRestartFlashcardDeck = (shouldShuffle = false) => {
    setShuffleNotice('');
    setReviewSessionIds(null);
    setFilterReviewOnly(false);

    if (shouldShuffle) {
      const untouchedIds = baseScopeVocab
        .filter((item) => !vocabStatus[item.id])
        .map((item) => item.id);
      if (untouchedIds.length === 0) {
        setShuffleSessionIds(null);
        setShuffleSeed(null);
        setIsFlashcardCompleted(false);
        setCurrentIndex(0);
        setShuffleNotice(
          'Tất cả các từ trong phần này đều đã được đánh dấu (Đã nhớ hoặc Cần ôn lại), không còn từ chưa thao tác để tráo.'
        );
        return;
      }
      setShuffleSessionIds(untouchedIds);
      setShuffleSeed(createRandomSeed());
    } else {
      setShuffleSessionIds(null);
      setShuffleSeed(null);
    }

    setIsFlashcardCompleted(false);
    setCurrentIndex(0);
    triggerCardTransition('next');
  };

  // Xóa tiến độ riêng bài/phạm vi hiện tại để học mới hoàn toàn
  const handleResetScopeProgress = () => {
    setVocabStatus((prev) => {
      const next = { ...prev };
      baseScopeVocab.forEach((item) => {
        delete next[item.id];
      });
      return next;
    });
    handleRestartFlashcardDeck(false);
  };

  // Nút Reset thẻ: xóa trạng thái Đã nhớ / Cần ôn của phạm vi đang học (có xác nhận) và quay về thẻ 1
  const handleConfirmResetCards = () => {
    const scopeLabel =
      selectedLesson === 'all'
        ? 'tất cả Bài 1–11'
        : selectedLesson === 'custom'
          ? 'kho Tự thêm'
          : `Bài ${selectedLesson}`;

    if (scopeStats.mastered > 0 || scopeStats.review > 0) {
      if (
        !window.confirm(
          `Reset trạng thái (Đã nhớ / Cần ôn) của ${scopeLabel} về 0 và quay lại thẻ đầu tiên?`
        )
      ) {
        return;
      }
      handleResetScopeProgress();
      return;
    }

    handleRestartFlashcardDeck(false);
  };

  useEffect(() => {
    if (subMode !== 'flashcard' || isFlashcardCompleted || editingWord) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key.toLowerCase() === 's' && currentWord) {
        e.preventDefault();
        speech.speak(currentWord.reading || currentWord.word_jp, speed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    subMode,
    isFlashcardCompleted,
    editingWord,
    handleNextCard,
    handlePrevCard,
    currentWord,
    speed,
    speech,
  ]);

  // ==========================================
  // EXERCISES STATE
  // ==========================================
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userScore, setUserScore] = useState({ correct: 0, wrong: 0 });
  const [wrongAnswersList, setWrongAnswersList] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [onlyWrongMode, setOnlyWrongMode] = useState(false);

  const resetFlashcardSession = () => {
    setShuffleNotice('');
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFlashcardCompleted(false);
    setReviewSessionIds(null);
    setShuffleSessionIds(null);
    setShuffleSeed(null);
    setCardAnimKey((k) => k + 1);
  };

  const resetExerciseProgress = () => {
    setExerciseIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setUserScore({ correct: 0, wrong: 0 });
    setIsCompleted(false);
  };

  const handleSelectLesson = (lessonVal) => {
    setSelectedLesson(lessonVal);
    resetFlashcardSession();
    resetExerciseProgress();
  };

  const handleSwitchSubMode = (mode) => {
    setSubMode(mode);
    if (mode === 'exercise' && selectedLesson === 'custom') {
      setSelectedLesson('all');
      resetExerciseProgress();
    }
  };

  const filteredExercises = useMemo(() => {
    let list = exercisesData;
    if (onlyWrongMode) {
      list = wrongAnswersList;
    } else if (selectedLesson !== 'all') {
      const lessonNum = Number(selectedLesson);
      list = list.filter((item) => item.lesson === lessonNum);
    }
    return list;
  }, [selectedLesson, onlyWrongMode, wrongAnswersList]);

  const currentExercise = filteredExercises[exerciseIndex] || null;

  const handleSelectOption = (option) => {
    if (isAnswered || !currentExercise) return;
    setSelectedAnswer(option);
    setIsAnswered(true);

    const isCorrect = option === currentExercise.correct_answer;
    if (isCorrect) {
      setUserScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setUserScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
      setWrongAnswersList((prev) => {
        if (!prev.some((x) => x.id === currentExercise.id)) {
          return [...prev, currentExercise];
        }
        return prev;
      });
    }
  };

  const handleNextExercise = () => {
    if (exerciseIndex + 1 < filteredExercises.length) {
      setExerciseIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
      if (userScore.correct >= filteredExercises.length * 0.7) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
  };

  const handleRestartExercises = () => {
    setExerciseIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setUserScore({ correct: 0, wrong: 0 });
    setIsCompleted(false);
    setOnlyWrongMode(false);
  };

  const handleRetryWrongExercises = () => {
    if (wrongAnswersList.length === 0) return;
    setOnlyWrongMode(true);
    setExerciseIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setUserScore({ correct: 0, wrong: 0 });
    setIsCompleted(false);
  };

  const lessonNumber = Number(selectedLesson);
  const hasNextLesson = !Number.isNaN(lessonNumber) && lessonNumber >= 1 && lessonNumber < 11;

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fadeIn">
      {/* Top Controller Bar */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700">
            <button
              onClick={() => handleSwitchSubMode('flashcard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                subMode === 'flashcard'
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Flashcard Từ Vựng</span>
            </button>

            <button
              onClick={() => handleSwitchSubMode('exercise')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                subMode === 'exercise'
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Bài Tập Thực Hành</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Đã nhớ: {scopeStats.mastered}/{scopeStats.total}
              </span>
            </span>
            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Cần ôn: {scopeStats.review}</span>
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full no-scrollbar">
            <button
              onClick={() => handleSelectLesson('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedLesson === 'all'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tất cả (Bài 1–11)
            </button>

            {subMode === 'flashcard' && customVocab.length > 0 && (
              <button
                onClick={() => handleSelectLesson('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedLesson === 'custom'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200/80 dark:border-purple-800/60'
                }`}
                title="Các từ vựng đã lưu từ Trợ lý Dịch AI"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tự thêm ({customVocab.length})</span>
              </button>
            )}

            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
              <button
                key={num}
                onClick={() => handleSelectLesson(String(num))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedLesson === String(num)
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Bài {num}
              </button>
            ))}
          </div>

          {subMode === 'flashcard' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    resetFlashcardSession();
                  }}
                  placeholder="Tìm Kanji, Kana, Tiếng Việt..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      resetFlashcardSession();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setFilterReviewOnly((prev) => !prev);
                  resetFlashcardSession();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  filterReviewOnly
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title="Lọc chỉ những từ cần ôn lại"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Từ cần ôn</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CHẾ ĐỘ 1: FLASHCARD 3D */}
      {subMode === 'flashcard' && (
        <div className="space-y-4">
          {isFlashcardCompleted ? (
            /* ===================================================== */
            /* MÀN HÌNH TỔNG KẾT SAU KHI HỌC HẾT BỘ THẺ             */
            /* ===================================================== */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-6 animate-fadeIn">
              <div className="text-center space-y-2.5">
                <div
                  className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-md ${
                    scopeStats.unmasteredList.length === 0
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white'
                      : 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white'
                  }`}
                >
                  {scopeStats.unmasteredList.length === 0 ? (
                    <Trophy className="w-8 h-8" />
                  ) : (
                    <RotateCcw className="w-8 h-8" />
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {scopeStats.unmasteredList.length === 0
                    ? 'Xuất sắc! Bạn đã thuộc hết tất cả từ vựng'
                    : 'Bạn đã lướt hết lượt học!'}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  {scopeStats.unmasteredList.length === 0
                    ? `Toàn bộ ${scopeStats.total} từ trong ${
                        selectedLesson === 'all'
                          ? 'Bài 1–11'
                          : selectedLesson === 'custom'
                            ? 'kho Tự thêm'
                            : `Bài ${selectedLesson}`
                      } đã được đánh dấu Đã nhớ.`
                    : `Bạn còn ${scopeStats.unmasteredList.length} từ chưa thuộc (${scopeStats.review} từ đánh dấu Cần ôn lại${
                        scopeStats.unseen > 0 ? `, ${scopeStats.unseen} từ chưa đánh dấu` : ''
                      }). Bạn có muốn ôn lại những từ chưa thuộc ngay không?`}
                </p>
              </div>

              {/* Thống kê tổng kết */}
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                    Đã nhớ
                  </p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
                    {scopeStats.mastered}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60">
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                    Cần ôn lại
                  </p>
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5 tabular-nums">
                    {scopeStats.review}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Tổng số từ
                  </p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 tabular-nums">
                    {scopeStats.total}
                  </p>
                </div>
              </div>

              {/* Danh sách xem nhanh các từ chưa thuộc */}
              {scopeStats.unmasteredList.length > 0 && (
                <div className="space-y-2.5 max-w-2xl mx-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Danh sách từ chưa thuộc ({scopeStats.unmasteredList.length})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Bấm biểu tượng loa để nghe nhanh
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40">
                    {scopeStats.unmasteredList.map((w) => (
                      <div
                        key={w.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              vocabStatus[w.id] === 'review'
                                ? 'bg-amber-500'
                                : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 dark:text-white font-japanese">
                                {w.word_jp}
                              </span>
                              {w.reading && w.reading !== w.word_jp && (
                                <span className="text-[11px] text-violet-600 dark:text-violet-400 font-japanese">
                                  ({w.reading})
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 truncate">
                              {w.meaning_vi}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => speech.speak(w.reading || w.word_jp, speed)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 shrink-0 transition-colors"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nút hành động chính */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {scopeStats.unmasteredList.length > 0 && (
                  <>
                    <button
                      onClick={() => handleStartReviewUnmastered(false)}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-105 text-white rounded-2xl text-sm font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Ôn lại {scopeStats.unmasteredList.length} từ chưa thuộc</span>
                    </button>

                    {scopeStats.unmasteredList.length > 1 && (
                      <button
                        onClick={() => handleStartReviewUnmastered(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95"
                      >
                        <Shuffle className="w-4 h-4" />
                        <span>Tráo &amp; ôn lại</span>
                      </button>
                    )}
                  </>
                )}

                {hasNextLesson && (
                  <button
                    onClick={() => handleSelectLesson(String(lessonNumber + 1))}
                    className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95"
                  >
                    <span>Học tiếp Bài {lessonNumber + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleRestartFlashcardDeck(false)}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-sm font-bold transition-all active:scale-95"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Học lại cả bài ({scopeStats.total} từ)</span>
                </button>

                {scopeStats.unseen > 0 && (
                  <button
                    onClick={() => handleRestartFlashcardDeck(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold transition-all active:scale-95"
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>Tráo {scopeStats.unseen} từ chưa thao tác</span>
                  </button>
                )}

                {selectedLesson !== 'custom' && (
                  <button
                    onClick={() => {
                      setSubMode('exercise');
                      resetExerciseProgress();
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-sm font-bold transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Làm bài tập trắc nghiệm</span>
                  </button>
                )}
              </div>

              {scopeStats.mastered > 0 && (
                <div className="text-center pt-1">
                  <button
                    onClick={() => {
                      if (window.confirm('Đặt lại trạng thái Đã nhớ / Cần ôn của phần từ vựng này?')) {
                        handleResetScopeProgress();
                      }
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-500 underline"
                  >
                    Đặt lại tiến độ bài này để học mới
                  </button>
                </div>
              )}
            </div>
          ) : filteredVocab.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Không tìm thấy từ vựng phù hợp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hãy thử đổi bài học, xóa từ khóa tìm kiếm hoặc tắt bộ lọc &ldquo;Từ cần ôn&rdquo;.
              </p>
              <button
                onClick={() => {
                  setSelectedLesson('all');
                  setSearchQuery('');
                  setFilterReviewOnly(false);
                  resetFlashcardSession();
                }}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700"
              >
                Xem tất cả {activeBaseVocab.length} từ vựng
              </button>
            </div>
          ) : (
            <>
              {/* Thông báo khi không còn từ chưa thao tác để tráo */}
              {shuffleNotice && (
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/70 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 animate-fadeIn">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{shuffleNotice}</span>
                  </div>
                  <button
                    onClick={() => setShuffleNotice('')}
                    className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Banner thông báo khi đang trong chế độ tráo các từ chưa thao tác */}
              {shuffleSessionIds && !reviewSessionIds && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/70 rounded-2xl text-xs text-violet-900 dark:text-violet-200 animate-fadeIn">
                  <div className="flex items-center gap-2 font-semibold">
                    <Shuffle className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                    <span>
                      Đang tráo <b>{filteredVocab.length} từ chưa có thao tác</b> (đã loại bỏ các từ Đã nhớ &amp; Cần ôn)
                    </span>
                  </div>
                  <button
                    onClick={handleResetOrder}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 text-violet-800 dark:text-violet-200 font-bold hover:bg-violet-100 transition-colors"
                  >
                    Thoát tráo thẻ
                  </button>
                </div>
              )}

              {/* Banner thông báo khi đang trong vòng ôn lại các từ chưa thuộc */}
              {reviewSessionIds && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-2xl text-xs text-amber-900 dark:text-amber-200 animate-fadeIn">
                  <div className="flex items-center gap-2 font-semibold">
                    <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      Đang ôn tập <b>{filteredVocab.length} từ chưa thuộc</b> • Bấm &ldquo;Đã nhớ&rdquo; khi bạn đã thuộc từ này
                    </span>
                  </div>
                  <button
                    onClick={() => handleRestartFlashcardDeck(false)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-bold hover:bg-amber-100 transition-colors"
                  >
                    Thoát chế độ ôn
                  </button>
                </div>
              )}

              {/* Flashcard Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevCard}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-all active:scale-95"
                    title="Từ trước (Phím ←)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Trước</span>
                  </button>

                  <span className="px-3 py-1.5 font-extrabold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/60 rounded-xl tabular-nums">
                    {safeIndex + 1} / {filteredVocab.length}
                  </span>

                  <button
                    onClick={handleNextCard}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-all active:scale-95"
                    title="Từ sau (Phím →)"
                  >
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleShuffleDeck}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all active:scale-95 ${
                      shuffleSeed !== null
                        ? 'bg-violet-600 text-white shadow-xs hover:bg-violet-700'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/70 hover:text-violet-600 dark:hover:text-violet-300 text-slate-600 dark:text-slate-300'
                    }`}
                    title={
                      reviewSessionIds
                        ? 'Tráo ngẫu nhiên các từ đang ôn'
                        : 'Tráo ngẫu nhiên chỉ những từ chưa có thao tác gì'
                    }
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{shuffleSeed !== null ? 'Tráo lại' : 'Tráo thẻ'}</span>
                  </button>

                  {shuffleSeed !== null && (
                    <button
                      onClick={handleResetOrder}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition-all active:scale-95"
                      title="Khôi phục toàn bộ danh sách theo thứ tự gốc"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Thứ tự gốc</span>
                    </button>
                  )}

                  <button
                    onClick={handleConfirmResetCards}
                    disabled={
                      scopeStats.mastered === 0 &&
                      scopeStats.review === 0 &&
                      safeIndex === 0 &&
                      shuffleSeed === null &&
                      !shuffleSessionIds &&
                      !reviewSessionIds
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60 font-semibold transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed"
                    title="Reset tiến độ thẻ (Đã nhớ / Cần ôn) của bài hiện tại và quay về thẻ 1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset thẻ</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCardShowFurigana(!cardShowFurigana)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-semibold border transition-all ${
                      cardShowFurigana
                        ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cardShowFurigana ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>Furigana</span>
                  </button>

                  {setSpeed && (
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      {[0.5, 0.75, 1.0, 1.25].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                            speed === s
                              ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-2xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                          title={`Tốc độ đọc ${s}x`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Session Progress Bar */}
              <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    reviewSessionIds
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-500'
                  }`}
                  style={{ width: `${((safeIndex + 1) / filteredVocab.length) * 100}%` }}
                />
              </div>

              {/* 3D Flip Flashcard với hiệu ứng lướt chuyển trang */}
              <div
                key={`${currentWord.id}-${cardAnimKey}`}
                className={`perspective-1000 ${
                  slideDirection === 'prev' ? 'animate-card-prev' : 'animate-card-next'
                }`}
              >
                <div
                  onClick={handleCardFlipClick}
                  className={`relative min-h-[340px] sm:min-h-[380px] w-full cursor-pointer preserve-3d transition-transform duration-500 ease-out ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* FRONT FACE */}
                  <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-white via-violet-50/35 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30 rounded-3xl border-2 border-violet-200/80 dark:border-slate-700/90 shadow-md p-6 sm:p-9 flex flex-col justify-between hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 select-none">
                        <span className="px-3 py-1 bg-violet-600 text-white rounded-xl text-xs font-bold shadow-2xs">
                          Bài {currentWord.lesson}
                        </span>
                        {vocabStatus[currentWord.id] === 'mastered' && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                            Đã nhớ
                          </span>
                        )}
                        {vocabStatus[currentWord.id] === 'review' && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                            Cần ôn
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1 shrink-0 select-none">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Lật thẻ</span>
                      </span>
                    </div>

                    <div className="my-auto text-center space-y-3 py-4 flex flex-col items-center">
                      {cardShowFurigana &&
                        currentWord.reading &&
                        currentWord.reading !== currentWord.word_jp && (
                          <p
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block px-2 py-0.5 rounded-lg text-sm sm:text-base font-bold text-violet-600 dark:text-violet-400 font-japanese select-text cursor-text"
                          >
                            {currentWord.reading}
                          </p>
                        )}
                      <h2
                        onClick={(e) => e.stopPropagation()}
                        className="inline-block px-3 py-1 rounded-2xl text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-wide font-japanese select-text cursor-text"
                      >
                        {currentWord.word_jp}
                      </h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500 select-none">
                        Bôi trực tiếp lên chữ để copy • Nhấn vùng trống hoặc Space để lật thẻ
                      </p>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-800 select-none"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => speech.speak(currentWord.reading || currentWord.word_jp, speed)}
                          className="flex items-center gap-2 px-4 py-2 bg-violet-100/90 dark:bg-violet-950/80 hover:bg-violet-200 dark:hover:bg-violet-900 text-violet-800 dark:text-violet-200 rounded-xl text-xs sm:text-sm font-bold transition-all"
                          title="Nghe phát âm (Phím S)"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>Phát âm ({speed}x)</span>
                        </button>

                        <button
                          onClick={() => handleCopyText(currentWord.word_jp, 'front_word')}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                            copiedKey === 'front_word'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border-slate-200/80 dark:border-slate-700'
                          }`}
                          title="Sao chép từ tiếng Nhật"
                        >
                          {copiedKey === 'front_word' ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="hidden sm:inline">Đã copy</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="hidden sm:inline">Copy chữ</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(currentWord)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
                          title="Chỉnh sửa nội dung thẻ này"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline">Sửa thẻ</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCard(currentWord)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
                          title="Xóa thẻ này vĩnh viễn khỏi dữ liệu"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Xóa thẻ</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkAndAdvance(currentWord.id, 'review')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            vocabStatus[currentWord.id] === 'review'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                          }`}
                          title="Đánh dấu cần ôn lại và chuyển sang từ tiếp theo"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>Cần ôn lại</span>
                        </button>

                        <button
                          onClick={() => handleMarkAndAdvance(currentWord.id, 'mastered')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            vocabStatus[currentWord.id] === 'mastered'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                          }`}
                          title="Đánh dấu đã nhớ và chuyển sang từ tiếp theo"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Đã nhớ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BACK FACE */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-white via-emerald-50/30 to-indigo-50/35 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/25 rounded-3xl border-2 border-emerald-300/80 dark:border-emerald-700/70 shadow-md p-6 sm:p-9 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-2xs select-none">
                        Nghĩa &amp; Ví dụ
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 shrink-0 select-none">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Mặt trước</span>
                      </span>
                    </div>

                    <div className="my-auto text-center space-y-4 py-3 flex flex-col items-center">
                      <div className="space-y-1.5 flex flex-col items-center">
                        {currentWord.han_viet && (
                          <span
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 rounded-lg text-xs font-bold border border-purple-200/70 dark:border-purple-800/60 select-text cursor-text"
                          >
                            Âm Hán: {currentWord.han_viet}
                          </span>
                        )}
                        <h3
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block px-3 py-0.5 rounded-xl text-2xl sm:text-3xl font-black text-slate-900 dark:text-white select-text cursor-text"
                        >
                          {currentWord.meaning_vi}
                        </h3>
                      </div>

                      {currentWord.example_jp && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="w-full p-3.5 bg-indigo-50/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 rounded-2xl max-w-lg mx-auto text-left space-y-1 select-text cursor-text"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider select-none">
                              Ví dụ minh họa
                            </p>
                            <button
                              onClick={() => handleCopyText(currentWord.example_jp, 'back_example')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/80 dark:bg-slate-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors select-none cursor-pointer"
                              title="Sao chép câu ví dụ"
                            >
                              {copiedKey === 'back_example' ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Đã copy</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy ví dụ</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-japanese">
                            {currentWord.example_jp}
                          </p>
                          {currentWord.example_vi && (
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {currentWord.example_vi}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-800 select-none"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => speech.speak(currentWord.reading || currentWord.word_jp, speed)}
                          className="flex items-center gap-2 px-4 py-2 bg-violet-100/90 dark:bg-violet-950/80 hover:bg-violet-200 dark:hover:bg-violet-900 text-violet-800 dark:text-violet-200 rounded-xl text-xs sm:text-sm font-bold transition-all"
                          title="Nghe phát âm (Phím S)"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>Phát âm ({speed}x)</span>
                        </button>

                        <button
                          onClick={() => handleCopyText(currentWord.word_jp, 'back_word')}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                            copiedKey === 'back_word'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border-slate-200/80 dark:border-slate-700'
                          }`}
                          title="Sao chép từ tiếng Nhật"
                        >
                          {copiedKey === 'back_word' ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="hidden sm:inline">Đã copy</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="hidden sm:inline">Copy chữ</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(currentWord)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
                          title="Chỉnh sửa nội dung thẻ này"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline">Sửa thẻ</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCard(currentWord)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
                          title="Xóa thẻ này vĩnh viễn khỏi dữ liệu"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Xóa thẻ</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkAndAdvance(currentWord.id, 'review')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            vocabStatus[currentWord.id] === 'review'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                          }`}
                          title="Đánh dấu cần ôn lại và chuyển sang từ tiếp theo"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>Cần ôn lại</span>
                        </button>

                        <button
                          onClick={() => handleMarkAndAdvance(currentWord.id, 'mastered')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            vocabStatus[currentWord.id] === 'mastered'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                          }`}
                          title="Đánh dấu đã nhớ và chuyển sang từ tiếp theo"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Đã nhớ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                Phím tắt:{' '}
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px]">
                  Space
                </kbd>{' '}
                Lật thẻ •{' '}
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px]">
                  ←
                </kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px]">
                  →
                </kbd>{' '}
                Chuyển từ •{' '}
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px]">
                  S
                </kbd>{' '}
                Phát âm
              </p>
            </>
          )}
        </div>
      )}

      {/* CHẾ ĐỘ 2: BÀI TẬP THỰC HÀNH */}
      {subMode === 'exercise' && (
        <div className="space-y-4">
          {filteredExercises.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <Award className="w-12 h-12 text-violet-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Không có bài tập cho bài này
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hãy chọn một bài học khác từ thanh chọn phía trên hoặc chọn &ldquo;Tất cả (Bài 1–11)&rdquo;.
              </p>
            </div>
          ) : isCompleted ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm animate-fadeIn">
              <div className="w-20 h-20 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 rounded-3xl flex items-center justify-center mx-auto text-violet-600 dark:text-violet-300">
                <Award className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Hoàn Thành Bài Tập!
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {onlyWrongMode
                    ? 'Bạn đã làm lại các câu bị sai'
                    : `Kết quả ôn tập: Bài ${selectedLesson === 'all' ? '1–11' : selectedLesson}`}
                </p>
              </div>

              <div className="flex justify-center gap-6">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl min-w-[120px]">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Đúng</p>
                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                    {userScore.correct}
                  </p>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-2xl min-w-[120px]">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">Sai</p>
                  <p className="text-3xl font-black text-rose-700 dark:text-rose-300">
                    {userScore.wrong}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <button
                  onClick={handleRestartExercises}
                  className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-2xl text-sm font-bold hover:bg-violet-700 shadow-md transition-all"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Làm lại từ đầu</span>
                </button>

                {wrongAnswersList.length > 0 && !onlyWrongMode && (
                  <button
                    onClick={handleRetryWrongExercises}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-sm font-bold hover:bg-rose-100 transition-all"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Làm lại {wrongAnswersList.length} câu sai</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-violet-600 text-white rounded-xl font-bold shadow-2xs">
                      Bài {currentExercise.lesson}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold">
                      {currentExercise.title}
                    </span>
                  </div>
                  <span className="font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                    Câu {exerciseIndex + 1} / {filteredExercises.length}
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${((exerciseIndex + 1) / filteredExercises.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-5 sm:p-7 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-3">
                <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed font-japanese whitespace-pre-line">
                  {currentExercise.question}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <HelpCircle className="w-4 h-4" />
                  <span>Chọn 1 trong các phương án bên dưới để điền vào chỗ trống</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentExercise.options.map((option, idx) => {
                  const isChosen = selectedAnswer === option;
                  const isCorrect = option === currentExercise.correct_answer;

                  let btnStyle =
                    'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/40 dark:hover:bg-violet-950/30 text-slate-800 dark:text-slate-100';

                  if (isAnswered) {
                    if (isCorrect) {
                      btnStyle =
                        'bg-emerald-500 text-white border-emerald-500 shadow-sm font-bold';
                    } else if (isChosen && !isCorrect) {
                      btnStyle =
                        'bg-rose-500 text-white border-rose-500 shadow-sm line-through';
                    } else {
                      btnStyle =
                        'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(option)}
                      className={`p-4 rounded-2xl border-2 text-left font-japanese font-bold text-base transition-all flex items-center justify-between ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-sans ${
                            isAnswered && (isCorrect || isChosen)
                              ? 'bg-white/25 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>
                      {isAnswered && isCorrect && <Check className="w-5 h-5 text-white" />}
                      {isAnswered && isChosen && !isCorrect && <X className="w-5 h-5 text-white" />}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className="p-4 sm:p-5 bg-indigo-50/70 dark:bg-indigo-950/35 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Giải thích chi tiết</span>
                    </span>

                    <button
                      onClick={() => speech.speak(currentExercise.full_sentence_jp, speed)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe câu mẫu ({speed}x)</span>
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {currentExercise.explanation}
                  </p>

                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60 flex justify-end">
                    <button
                      onClick={handleNextExercise}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
                    >
                      <span>
                        {exerciseIndex + 1 === filteredExercises.length
                          ? 'Xem kết quả'
                          : 'Câu tiếp theo'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL CHỈNH SỬA THẺ TỪ VỰNG */}
      {editingWord && (
        <div
          onClick={() => setEditingWord(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn"
        >
          <form
            onSubmit={handleSaveEditCard}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Chỉnh sửa thẻ từ vựng</h3>
                  <p className="text-[11px] text-indigo-100">
                    Bài {editingWord.lesson} • Thay đổi sẽ được lưu tự động
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWord(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                    Từ tiếng Nhật *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.word_jp}
                    onChange={(e) => setEditForm((f) => ({ ...f, word_jp: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-japanese font-bold focus:outline-none focus:border-violet-500"
                    placeholder="Ví dụ: 私"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                    Phiên âm (Hiragana / Katakana)
                  </label>
                  <input
                    type="text"
                    value={editForm.reading}
                    onChange={(e) => setEditForm((f) => ({ ...f, reading: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-japanese focus:outline-none focus:border-violet-500"
                    placeholder="Ví dụ: わたし"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                    Nghĩa tiếng Việt *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.meaning_vi}
                    onChange={(e) => setEditForm((f) => ({ ...f, meaning_vi: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:outline-none focus:border-violet-500"
                    placeholder="Ví dụ: Tôi"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                    Âm Hán Việt
                  </label>
                  <input
                    type="text"
                    value={editForm.han_viet}
                    onChange={(e) => setEditForm((f) => ({ ...f, han_viet: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
                    placeholder="Ví dụ: TƯ"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                  Chủ đề
                </label>
                <input
                  type="text"
                  value={editForm.topic}
                  onChange={(e) => setEditForm((f) => ({ ...f, topic: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                  Câu ví dụ tiếng Nhật
                </label>
                <textarea
                  rows={2}
                  value={editForm.example_jp}
                  onChange={(e) => setEditForm((f) => ({ ...f, example_jp: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-japanese resize-none focus:outline-none focus:border-violet-500"
                  placeholder="Ví dụ minh họa..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                  Dịch nghĩa ví dụ
                </label>
                <input
                  type="text"
                  value={editForm.example_vi}
                  onChange={(e) => setEditForm((f) => ({ ...f, example_vi: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
                  placeholder="Nghĩa tiếng Việt của câu ví dụ..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              {!String(editingWord.id).startsWith('custom_') && editedMap[editingWord.id] ? (
                <button
                  type="button"
                  onClick={handleRestoreDefaultCard}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                >
                  Khôi phục mặc định
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWord(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
