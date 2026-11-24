import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import imageQuestionsData from './data/questions.json';
import { useSpeech } from './hooks/useSpeech';
import {
  filterImageQuestions,
  filterNoImageQuestions,
  filterReadingPassages,
} from './utils/filters';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PracticeCard from './components/PracticeCard';

// Code-splitting: chỉ tải code & dữ liệu các tab phụ khi người dùng chuyển sang
const NoImageSidebar = lazy(() => import('./components/NoImageSidebar'));
const NoImagePracticeCard = lazy(() => import('./components/NoImagePracticeCard'));
const ReadingSidebar = lazy(() => import('./components/ReadingSidebar'));
const ReadingPracticeCard = lazy(() => import('./components/ReadingPracticeCard'));
const VocabPractice = lazy(() => import('./components/VocabPractice'));
const AiLookupView = lazy(() => import('./components/AiLookupView'));
const GeneralDrawer = lazy(() => import('./components/GeneralDrawer'));
const MockTestModal = lazy(() => import('./components/MockTestModal'));
const AiSettingsModal = lazy(() => import('./components/AiSettingsModal'));

const STORAGE_IMAGE_KEY = 'jpd133_progress_v1';
const STORAGE_NO_IMAGE_KEY = 'jpd133_no_image_progress_v1';
const STORAGE_READING_KEY = 'jpd133_reading_progress_v1';
const SPEED_KEY = 'jpd133_speed_v1';
const FURIGANA_KEY = 'jpd133_furigana_v1';
const THEME_KEY = 'jpd133_theme_v1';

function TabLoadingFallback({ label = 'Đang tải nội dung...' }) {
  return (
    <div className="max-w-4xl mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 text-sm shadow-sm animate-fadeIn">
      <div className="w-8 h-8 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="font-medium">{label}</p>
    </div>
  );
}

export default function App() {
  // Tabs: 'image' | 'no-image' | 'reading' | 'vocabulary' | 'ai-lookup' | 'mocktest'
  const [activeTab, setActiveTab] = useState('image');

  // Lazy-loaded datasets cho các tab phụ
  const [noImageQuestionsData, setNoImageQuestionsData] = useState(null);
  const [readingPassagesData, setReadingPassagesData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if ((activeTab === 'no-image' || activeTab === 'mocktest') && !noImageQuestionsData) {
      import('./data/no_image_questions.json').then((mod) => {
        if (!cancelled) setNoImageQuestionsData(mod.default);
      });
    }
    if ((activeTab === 'reading' || activeTab === 'mocktest') && !readingPassagesData) {
      import('./data/reading_passages.json').then((mod) => {
        if (!cancelled) setReadingPassagesData(mod.default);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [activeTab, noImageQuestionsData, readingPassagesData]);

  // Sidebar toggle state (mặc định mở cố định trên Desktop/Laptop >= 1024px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const [isGeneralDrawerOpen, setIsGeneralDrawerOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

  // Settings
  const [speed, setSpeed] = useState(() => {
    const saved = localStorage.getItem(SPEED_KEY);
    return saved ? Number(saved) : 1.0;
  });

  const [showFurigana, setShowFurigana] = useState(() => {
    const saved = localStorage.getItem(FURIGANA_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(THEME_KEY) === 'dark';
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  // Progress States
  const [progressImage, setProgressImage] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_IMAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [progressNoImage, setProgressNoImage] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_NO_IMAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [progressReading, setProgressReading] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_READING_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Current IDs for each tab
  const [currentImageId, setCurrentImageId] = useState(1);
  const [currentNoImageId, setCurrentNoImageId] = useState(1);
  const [currentReadingId, setCurrentReadingId] = useState(1);

  // Filters for Image Tab
  const [imageLessonFilter, setImageLessonFilter] = useState('all');
  const [imageStatusFilter, setImageStatusFilter] = useState('all');
  const [imageSearchQuery, setImageSearchQuery] = useState('');

  // Filters for No-Image Tab
  const [noImageLessonFilter, setNoImageLessonFilter] = useState('all');
  const [noImageStatusFilter, setNoImageStatusFilter] = useState('all');
  const [noImageSearchQuery, setNoImageSearchQuery] = useState('');

  // Filters for Reading Tab
  const [readingGroupFilter, setReadingGroupFilter] = useState('all');
  const [readingStatusFilter, setReadingStatusFilter] = useState('all');
  const [readingSearchQuery, setReadingSearchQuery] = useState('');

  // Speech Controller
  const speech = useSpeech(speed);

  // Save Settings to localStorage
  useEffect(() => {
    localStorage.setItem(SPEED_KEY, String(speed));
  }, [speed]);

  useEffect(() => {
    localStorage.setItem(FURIGANA_KEY, JSON.stringify(showFurigana));
  }, [showFurigana]);

  useEffect(() => {
    localStorage.setItem(STORAGE_IMAGE_KEY, JSON.stringify(progressImage));
  }, [progressImage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_NO_IMAGE_KEY, JSON.stringify(progressNoImage));
  }, [progressNoImage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_READING_KEY, JSON.stringify(progressReading));
  }, [progressReading]);

  // Update Status Handlers
  const handleUpdateImageStatus = useCallback((id, status) => {
    setProgressImage((prev) => {
      const updated = { ...prev };
      if (status === 'unseen') delete updated[id];
      else updated[id] = status;
      return updated;
    });
  }, []);

  const handleUpdateNoImageStatus = useCallback((id, status) => {
    setProgressNoImage((prev) => {
      const updated = { ...prev };
      if (status === 'unseen') delete updated[id];
      else updated[id] = status;
      return updated;
    });
  }, []);

  const handleUpdateReadingStatus = useCallback((id, status) => {
    setProgressReading((prev) => {
      const updated = { ...prev };
      if (status === 'unseen') delete updated[id];
      else updated[id] = status;
      return updated;
    });
  }, []);

  // Reset Handlers
  const handleResetImageProgress = useCallback(() => {
    setProgressImage({});
    localStorage.removeItem(STORAGE_IMAGE_KEY);
  }, []);

  const handleResetNoImageProgress = useCallback(() => {
    setProgressNoImage({});
    localStorage.removeItem(STORAGE_NO_IMAGE_KEY);
  }, []);

  const handleResetReadingProgress = useCallback(() => {
    setProgressReading({});
    localStorage.removeItem(STORAGE_READING_KEY);
  }, []);

  // Filtered Lists (dùng chung logic với Sidebar để nút Trước/Sau luôn khớp)
  const filteredImageList = useMemo(
    () =>
      filterImageQuestions(imageQuestionsData, {
        lessonFilter: imageLessonFilter,
        statusFilter: imageStatusFilter,
        searchQuery: imageSearchQuery,
        progress: progressImage,
      }),
    [imageLessonFilter, imageStatusFilter, imageSearchQuery, progressImage]
  );

  const filteredNoImageList = useMemo(() => {
    if (!noImageQuestionsData) return [];
    return filterNoImageQuestions(noImageQuestionsData, {
      lessonFilter: noImageLessonFilter,
      statusFilter: noImageStatusFilter,
      searchQuery: noImageSearchQuery,
      progress: progressNoImage,
    });
  }, [noImageQuestionsData, noImageLessonFilter, noImageStatusFilter, noImageSearchQuery, progressNoImage]);

  const filteredReadingList = useMemo(() => {
    if (!readingPassagesData) return [];
    return filterReadingPassages(readingPassagesData, {
      groupFilter: readingGroupFilter,
      statusFilter: readingStatusFilter,
      searchQuery: readingSearchQuery,
      progress: progressReading,
    });
  }, [readingPassagesData, readingGroupFilter, readingStatusFilter, readingSearchQuery, progressReading]);

  // Current Objects
  const currentImageQuestion = useMemo(() => {
    return imageQuestionsData.find((q) => q.id === currentImageId) || imageQuestionsData[0];
  }, [currentImageId]);

  const nextImageSrc = useMemo(() => {
    const list = filteredImageList.length > 0 ? filteredImageList : imageQuestionsData;
    const idx = list.findIndex((q) => q.id === currentImageId);
    const nextItem = idx !== -1 && idx < list.length - 1 ? list[idx + 1] : list[0];
    return nextItem?.image || null;
  }, [currentImageId, filteredImageList]);

  const currentNoImageQuestion = useMemo(() => {
    if (!noImageQuestionsData || noImageQuestionsData.length === 0) return null;
    return noImageQuestionsData.find((q) => q.id === currentNoImageId) || noImageQuestionsData[0];
  }, [noImageQuestionsData, currentNoImageId]);

  const currentReadingPassage = useMemo(() => {
    if (!readingPassagesData || readingPassagesData.length === 0) return null;
    return readingPassagesData.find((p) => p.id === currentReadingId) || readingPassagesData[0];
  }, [readingPassagesData, currentReadingId]);

  // Navigation for Image Tab
  const handlePrevImage = useCallback(() => {
    const list = filteredImageList.length > 0 ? filteredImageList : imageQuestionsData;
    const idx = list.findIndex((q) => q.id === currentImageId);
    if (idx > 0) setCurrentImageId(list[idx - 1].id);
    else setCurrentImageId(list[list.length - 1].id);
  }, [currentImageId, filteredImageList]);

  const handleNextImage = useCallback(() => {
    const list = filteredImageList.length > 0 ? filteredImageList : imageQuestionsData;
    const idx = list.findIndex((q) => q.id === currentImageId);
    if (idx !== -1 && idx < list.length - 1) setCurrentImageId(list[idx + 1].id);
    else setCurrentImageId(list[0].id);
  }, [currentImageId, filteredImageList]);

  const handleRandomImage = useCallback(() => {
    const list = filteredImageList.length > 0 ? filteredImageList : imageQuestionsData;
    const randomIdx = Math.floor(Math.random() * list.length);
    setCurrentImageId(list[randomIdx].id);
  }, [filteredImageList]);

  // Navigation for No-Image Tab
  const handlePrevNoImage = useCallback(() => {
    if (!noImageQuestionsData || noImageQuestionsData.length === 0) return;
    const list = filteredNoImageList.length > 0 ? filteredNoImageList : noImageQuestionsData;
    const idx = list.findIndex((q) => q.id === currentNoImageId);
    if (idx > 0) setCurrentNoImageId(list[idx - 1].id);
    else setCurrentNoImageId(list[list.length - 1].id);
  }, [noImageQuestionsData, currentNoImageId, filteredNoImageList]);

  const handleNextNoImage = useCallback(() => {
    if (!noImageQuestionsData || noImageQuestionsData.length === 0) return;
    const list = filteredNoImageList.length > 0 ? filteredNoImageList : noImageQuestionsData;
    const idx = list.findIndex((q) => q.id === currentNoImageId);
    if (idx !== -1 && idx < list.length - 1) setCurrentNoImageId(list[idx + 1].id);
    else setCurrentNoImageId(list[0].id);
  }, [noImageQuestionsData, currentNoImageId, filteredNoImageList]);

  const handleRandomNoImage = useCallback(() => {
    if (!noImageQuestionsData || noImageQuestionsData.length === 0) return;
    const list = filteredNoImageList.length > 0 ? filteredNoImageList : noImageQuestionsData;
    const randomIdx = Math.floor(Math.random() * list.length);
    setCurrentNoImageId(list[randomIdx].id);
  }, [noImageQuestionsData, filteredNoImageList]);

  // Navigation for Reading Tab
  const handlePrevReading = useCallback(() => {
    if (!readingPassagesData || readingPassagesData.length === 0) return;
    const list = filteredReadingList.length > 0 ? filteredReadingList : readingPassagesData;
    const idx = list.findIndex((p) => p.id === currentReadingId);
    if (idx > 0) setCurrentReadingId(list[idx - 1].id);
    else setCurrentReadingId(list[list.length - 1].id);
  }, [readingPassagesData, currentReadingId, filteredReadingList]);

  const handleNextReading = useCallback(() => {
    if (!readingPassagesData || readingPassagesData.length === 0) return;
    const list = filteredReadingList.length > 0 ? filteredReadingList : readingPassagesData;
    const idx = list.findIndex((p) => p.id === currentReadingId);
    if (idx !== -1 && idx < list.length - 1) setCurrentReadingId(list[idx + 1].id);
    else setCurrentReadingId(list[0].id);
  }, [readingPassagesData, currentReadingId, filteredReadingList]);

  const handleRandomReading = useCallback(() => {
    if (!readingPassagesData || readingPassagesData.length === 0) return;
    const list = filteredReadingList.length > 0 ? filteredReadingList : readingPassagesData;
    const randomIdx = Math.floor(Math.random() * list.length);
    setCurrentReadingId(list[randomIdx].id);
  }, [readingPassagesData, filteredReadingList]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeTab === 'image') handlePrevImage();
        else if (activeTab === 'no-image') handlePrevNoImage();
        else if (activeTab === 'reading') handlePrevReading();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeTab === 'image') handleNextImage();
        else if (activeTab === 'no-image') handleNextNoImage();
        else if (activeTab === 'reading') handleNextReading();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (activeTab === 'image') {
          const allText = currentImageQuestion.qa.map((item) => item.q_jp).join(' ... ');
          speech.speak(allText, speed);
        } else if (activeTab === 'no-image' && currentNoImageQuestion) {
          speech.speak(currentNoImageQuestion.q_jp, speed);
        } else if (activeTab === 'reading' && currentReadingPassage) {
          speech.speak(currentReadingPassage.jp_text, speed);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTab,
    handlePrevImage,
    handleNextImage,
    handlePrevNoImage,
    handleNextNoImage,
    handlePrevReading,
    handleNextReading,
    currentImageQuestion,
    currentNoImageQuestion,
    currentReadingPassage,
    speed,
    speech,
  ]);

  // Điều khiển toggle sidebar / drawer phù hợp theo từng tab
  const handleToggleSidebar = useCallback(() => {
    if (activeTab === 'vocabulary' || activeTab === 'ai-lookup') {
      setIsGeneralDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        speed={speed}
        setSpeed={setSpeed}
        showFurigana={showFurigana}
        setShowFurigana={setShowFurigana}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        toggleSidebar={handleToggleSidebar}
        isSidebarOpen={
          activeTab === 'vocabulary' || activeTab === 'ai-lookup'
            ? isGeneralDrawerOpen
            : isSidebarOpen
        }
        onOpenMockTest={() => setActiveTab('mocktest')}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Left Sidebar according to active tab */}
        {activeTab === 'image' && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            questions={imageQuestionsData}
            currentId={currentImageId}
            onSelectQuestion={(id) => setCurrentImageId(id)}
            lessonFilter={imageLessonFilter}
            setLessonFilter={setImageLessonFilter}
            statusFilter={imageStatusFilter}
            setStatusFilter={setImageStatusFilter}
            searchQuery={imageSearchQuery}
            setSearchQuery={setImageSearchQuery}
            progress={progressImage}
            onResetProgress={handleResetImageProgress}
          />
        )}

        {activeTab === 'no-image' && noImageQuestionsData && (
          <Suspense fallback={null}>
            <NoImageSidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              questions={noImageQuestionsData}
              currentId={currentNoImageId}
              onSelectQuestion={(id) => setCurrentNoImageId(id)}
              lessonFilter={noImageLessonFilter}
              setLessonFilter={setNoImageLessonFilter}
              statusFilter={noImageStatusFilter}
              setStatusFilter={setNoImageStatusFilter}
              searchQuery={noImageSearchQuery}
              setSearchQuery={setNoImageSearchQuery}
              progress={progressNoImage}
              onResetProgress={handleResetNoImageProgress}
            />
          </Suspense>
        )}

        {activeTab === 'reading' && readingPassagesData && (
          <Suspense fallback={null}>
            <ReadingSidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              passages={readingPassagesData}
              currentId={currentReadingId}
              onSelectPassage={(id) => setCurrentReadingId(id)}
              groupFilter={readingGroupFilter}
              setGroupFilter={setReadingGroupFilter}
              statusFilter={readingStatusFilter}
              setStatusFilter={setReadingStatusFilter}
              searchQuery={readingSearchQuery}
              setSearchQuery={setReadingSearchQuery}
              progress={progressReading}
              onResetProgress={handleResetReadingProgress}
            />
          </Suspense>
        )}

        {/* General Navigation Drawer for Vocabulary and AI Lookup tabs (lazy) */}
        {(activeTab === 'vocabulary' || activeTab === 'ai-lookup') && isGeneralDrawerOpen && (
          <Suspense fallback={null}>
            <GeneralDrawer
              isOpen={isGeneralDrawerOpen}
              onClose={() => setIsGeneralDrawerOpen(false)}
              activeTab={activeTab}
              onOpenAiSettings={() => setIsAiSettingsOpen(true)}
            />
          </Suspense>
        )}

        {/* Center Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'image' && (
            <PracticeCard
              key={currentImageQuestion.id}
              question={currentImageQuestion}
              nextImageSrc={nextImageSrc}
              totalCount={imageQuestionsData.length}
              onPrev={handlePrevImage}
              onNext={handleNextImage}
              onRandom={handleRandomImage}
              onStatusChange={handleUpdateImageStatus}
              status={progressImage[currentImageQuestion.id] || 'unseen'}
              showFurigana={showFurigana}
              speech={speech}
              speed={speed}
              setSpeed={setSpeed}
            />
          )}

          {activeTab === 'no-image' && (
            <Suspense fallback={<TabLoadingFallback label="Đang tải 39 câu phản xạ..." />}>
              {currentNoImageQuestion ? (
                <NoImagePracticeCard
                  key={currentNoImageQuestion.id}
                  question={currentNoImageQuestion}
                  totalCount={noImageQuestionsData.length}
                  onPrev={handlePrevNoImage}
                  onNext={handleNextNoImage}
                  onRandom={handleRandomNoImage}
                  onStatusChange={handleUpdateNoImageStatus}
                  status={progressNoImage[currentNoImageQuestion.id] || 'unseen'}
                  showFurigana={showFurigana}
                  speech={speech}
                  speed={speed}
                  setSpeed={setSpeed}
                />
              ) : (
                <TabLoadingFallback label="Đang tải 39 câu phản xạ..." />
              )}
            </Suspense>
          )}

          {activeTab === 'reading' && (
            <Suspense fallback={<TabLoadingFallback label="Đang tải 16 bài luyện đọc..." />}>
              {currentReadingPassage ? (
                <ReadingPracticeCard
                  key={currentReadingPassage.id}
                  passage={currentReadingPassage}
                  totalCount={readingPassagesData.length}
                  onPrev={handlePrevReading}
                  onNext={handleNextReading}
                  onRandom={handleRandomReading}
                  onStatusChange={handleUpdateReadingStatus}
                  status={progressReading[currentReadingPassage.id] || 'unseen'}
                  showFurigana={showFurigana}
                  speech={speech}
                  speed={speed}
                  setSpeed={setSpeed}
                  onOpenAiSettings={() => setIsAiSettingsOpen(true)}
                />
              ) : (
                <TabLoadingFallback label="Đang tải 16 bài luyện đọc..." />
              )}
            </Suspense>
          )}

          {activeTab === 'vocabulary' && (
            <Suspense fallback={<TabLoadingFallback label="Đang tải kho từ vựng & bài tập..." />}>
              <VocabPractice
                showFurigana={showFurigana}
                speech={speech}
                speed={speed}
                setSpeed={setSpeed}
              />
            </Suspense>
          )}

          {activeTab === 'ai-lookup' && (
            <Suspense fallback={<TabLoadingFallback label="Đang tải trợ lý dịch AI..." />}>
              <AiLookupView
                speech={speech}
                speed={speed}
                onOpenAiSettings={() => setIsAiSettingsOpen(true)}
              />
            </Suspense>
          )}

          {activeTab === 'mocktest' && (
            <Suspense fallback={<TabLoadingFallback label="Đang chuẩn bị phòng thi thử..." />}>
              {noImageQuestionsData && readingPassagesData ? (
                <MockTestModal
                  imageQuestions={imageQuestionsData}
                  noImageQuestions={noImageQuestionsData}
                  readingPassages={readingPassagesData}
                  onClose={() => setActiveTab('image')}
                  speech={speech}
                  speed={speed}
                  setSpeed={setSpeed}
                  showFurigana={showFurigana}
                  onUpdateImageStatus={handleUpdateImageStatus}
                  onUpdateNoImageStatus={handleUpdateNoImageStatus}
                  onUpdateReadingStatus={handleUpdateReadingStatus}
                />
              ) : (
                <TabLoadingFallback label="Đang chuẩn bị phòng thi thử..." />
              )}
            </Suspense>
          )}
        </main>
      </div>

      {/* AI Settings Modal (lazy-mount khi mở) */}
      {isAiSettingsOpen && (
        <Suspense fallback={null}>
          <AiSettingsModal
            isOpen={isAiSettingsOpen}
            onClose={() => setIsAiSettingsOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
