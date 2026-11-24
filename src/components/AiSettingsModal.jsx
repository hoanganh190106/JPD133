import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Eye,
  EyeOff,
  ClipboardPaste,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { getAiConfig, saveAiConfig, testAiConnection } from '../utils/aiClient';

export default function AiSettingsModal({ isOpen, onClose }) {
  const initialConfig = getAiConfig();
  const initialModel =
    initialConfig.model === 'gemini-2.5-flash'
      ? 'gemini-3.8-flash'
      : initialConfig.model || (initialConfig.provider === 'deepseek' ? 'deepseek-chat' : 'gemini-3.8-flash');

  const [provider, setProvider] = useState(initialConfig.provider || 'gemini');
  const [apiKey, setApiKey] = useState(initialConfig.apiKey || '');
  const [model, setModel] = useState(initialModel);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Tự động chuyển model mặc định khi đổi provider
  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    if (newProvider === 'gemini') {
      setModel('gemini-3.8-flash');
    } else {
      setModel('deepseek-chat');
    }
    setTestResult(null);
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Vui lòng nhập API Key trước khi kiểm tra.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const res = await testAiConnection({
      provider,
      apiKey: apiKey.trim(),
      model
    });

    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    const finalModel = (provider === 'gemini' && model === 'gemini-2.5-flash') ? 'gemini-3.8-flash' : model;
    saveAiConfig({
      provider,
      apiKey: apiKey.trim(),
      model: finalModel
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn"
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Cài đặt Trợ lý AI</h2>
              <p className="text-xs text-indigo-100">Dịch thuật & Phân tích tiếng Nhật theo nhu cầu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* 1. Chọn Nhà cung cấp */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider block">
              1. Chọn Nhà cung cấp AI (Provider)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  provider === 'gemini'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Google Gemini</span>
                  {provider === 'gemini' && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Mặc định: gemini-3.8-flash (Nhanh & Miễn phí)</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('deepseek')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  provider === 'deepseek'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">DeepSeek</span>
                  {provider === 'deepseek' && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Model: deepseek-chat (Thông minh & Tiết kiệm)</span>
              </button>
            </div>
          </div>

          {/* 2. Chọn Model */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
              Mã Model (Mặc định được khuyến nghị)
            </label>
            {provider === 'gemini' ? (
              <select
                value={model === 'gemini-2.5-flash' ? 'gemini-3.8-flash' : model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Khuyên dùng - Nhanh, chuẩn nhất)</option>
                <option value="gemini-3.8-pro">gemini-3.8-pro (Phân tích sâu, chính xác cao)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Dự phòng ổn định)</option>
              </select>
            ) : (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-chat"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* 3. Nhập API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                2. API Key ({provider === 'gemini' ? 'Gemini API Key' : 'DeepSeek API Key'})
              </label>
              <button
                type="button"
                onClick={handlePasteKey}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Dán từ bộ nhớ tạm</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                  title={showKey ? 'Ẩn Key' : 'Hiện Key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Lưu an toàn 100% trong trình duyệt máy bạn</span>
              </span>
              {provider === 'gemini' ? (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Lấy Gemini Key miễn phí</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Lấy DeepSeek Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {testResult && (
            <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 animate-fadeIn ${
              testResult.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">{testResult.success ? 'Kiểm tra thành công!' : 'Kiểm tra thất bại'}</p>
                <p>{testResult.message}</p>
              </div>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã lưu cài đặt AI thành công!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isTesting || !apiKey.trim()}
            onClick={handleTestConnection}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Đang kết nối...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Kiểm tra kết nối</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
