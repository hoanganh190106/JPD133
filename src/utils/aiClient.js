// Quản lý cấu hình, cache, từ vựng custom và gọi API AI (Gemini & DeepSeek)
// Tách riêng khỏi dữ liệu giáo trình để tránh kéo các file JSON lớn vào bundle chính.

const AI_CONFIG_KEY = 'jpd133_ai_config_v1';
const CUSTOM_VOCAB_KEY = 'jpd133_custom_vocab_v1';
const DELETED_VOCAB_KEY = 'jpd133_deleted_vocab_v2';
const EDITED_VOCAB_KEY = 'jpd133_edited_vocab_v2';
const AI_HISTORY_KEY = 'jpd133_ai_lookup_history_v1';
const AI_CACHE_KEY = 'jpd133_ai_translation_cache_v1';
const MAX_CACHE_ENTRIES = 150;

export const DEFAULT_AI_CONFIG = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-3.8-flash',
};

let customVocabMemoryCache = null;
let deletedVocabMemoryCache = null;
let editedVocabMemoryCache = null;
let aiCacheMemory = null;

// ====================================================================
// QUẢN LÝ CẤU HÌNH
// ====================================================================
export function getAiConfig() {
  try {
    const saved = localStorage.getItem(AI_CONFIG_KEY);
    if (saved) {
      const config = { ...DEFAULT_AI_CONFIG, ...JSON.parse(saved) };
      if (config.provider === 'gemini') {
        if (!config.model || config.model === 'gemini-2.5-flash') {
          config.model = 'gemini-3.8-flash';
          localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
        }
      }
      return config;
    }
  } catch (e) {
    console.error('Error reading AI config:', e);
  }
  return DEFAULT_AI_CONFIG;
}

export function saveAiConfig(config) {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Error saving AI config:', e);
    return false;
  }
}

// ====================================================================
// BỘ NHỚ ĐỆM (CACHE) KẾT QUẢ AI (RAM + localStorage)
// ====================================================================
function normalizeCacheKey(text) {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getAiCache() {
  if (aiCacheMemory !== null) return aiCacheMemory;
  try {
    const saved = localStorage.getItem(AI_CACHE_KEY);
    aiCacheMemory = saved ? JSON.parse(saved) : {};
  } catch {
    aiCacheMemory = {};
  }
  return aiCacheMemory;
}

export function getCachedAiResult(query) {
  const key = normalizeCacheKey(query);
  if (!key) return null;
  const cache = getAiCache();
  return cache[key] || null;
}

export function saveCachedAiResult(query, result) {
  try {
    const key = normalizeCacheKey(query);
    if (!key || !result) return;
    const cache = { ...getAiCache() };
    cache[key] = {
      ...result,
      _cachedAt: Date.now(),
    };

    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      const keysToDelete = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
      keysToDelete.forEach((k) => delete cache[k]);
    }

    aiCacheMemory = cache;
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Error saving AI cache:', e);
  }
}

// ====================================================================
// QUẢN LÝ TỪ VỰNG CUSTOM & LỊCH SỬ TRA CỨU
// ====================================================================
export function getCustomVocab() {
  if (customVocabMemoryCache !== null) return customVocabMemoryCache;
  try {
    const saved = localStorage.getItem(CUSTOM_VOCAB_KEY);
    customVocabMemoryCache = saved ? JSON.parse(saved) : [];
  } catch {
    customVocabMemoryCache = [];
  }
  return customVocabMemoryCache;
}

export function saveCustomVocab(item) {
  try {
    const list = getCustomVocab();
    const exists = list.some((x) => x.word === item.word || x.word_jp === item.word);
    if (!exists) {
      const newItem = {
        id: 'custom_' + Date.now(),
        word_jp: item.word || item.word_jp,
        reading: item.reading || item.reading_hiragana || '',
        meaning_vi: item.meaning || item.meaning_vi || '',
        han_viet: item.han_viet || '',
        grammar: item.grammar || item.grammar_notes || '',
        lesson: 'Tự thêm',
        topic: 'Tra cứu AI',
        createdAt: new Date().toISOString(),
      };
      const updated = [newItem, ...list];
      customVocabMemoryCache = updated;
      localStorage.setItem(CUSTOM_VOCAB_KEY, JSON.stringify(updated));
      return newItem;
    }
  } catch (e) {
    console.error('Error saving custom vocab:', e);
  }
  return null;
}

export function removeCustomVocab(id) {
  try {
    const list = getCustomVocab();
    const updated = list.filter((item) => item.id !== id);
    customVocabMemoryCache = updated;
    localStorage.setItem(CUSTOM_VOCAB_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error removing custom vocab:', e);
    return getCustomVocab();
  }
}

export function getDeletedVocabIds() {
  if (deletedVocabMemoryCache !== null) return deletedVocabMemoryCache;
  try {
    const saved = localStorage.getItem(DELETED_VOCAB_KEY);
    const arr = saved ? JSON.parse(saved) : [];
    deletedVocabMemoryCache = new Set(Array.isArray(arr) ? arr : []);
  } catch {
    deletedVocabMemoryCache = new Set();
  }
  return deletedVocabMemoryCache;
}

export function addDeletedVocabId(id) {
  try {
    const current = new Set(getDeletedVocabIds());
    current.add(id);
    deletedVocabMemoryCache = current;
    localStorage.setItem(DELETED_VOCAB_KEY, JSON.stringify([...current]));
    return current;
  } catch (e) {
    console.error('Error deleting vocab id:', e);
    return getDeletedVocabIds();
  }
}

export function updateCustomVocabItem(id, patch) {
  try {
    const list = getCustomVocab();
    const updated = list.map((item) => (item.id === id ? { ...item, ...patch } : item));
    customVocabMemoryCache = updated;
    localStorage.setItem(CUSTOM_VOCAB_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error updating custom vocab:', e);
    return getCustomVocab();
  }
}

export function getEditedVocabMap() {
  if (editedVocabMemoryCache !== null) return editedVocabMemoryCache;
  try {
    const saved = localStorage.getItem(EDITED_VOCAB_KEY);
    editedVocabMemoryCache = saved ? JSON.parse(saved) : {};
  } catch {
    editedVocabMemoryCache = {};
  }
  return editedVocabMemoryCache;
}

export function saveEditedVocabItem(id, patch) {
  try {
    const current = { ...getEditedVocabMap() };
    current[id] = { ...(current[id] || {}), ...patch };
    editedVocabMemoryCache = current;
    localStorage.setItem(EDITED_VOCAB_KEY, JSON.stringify(current));
    return current;
  } catch (e) {
    console.error('Error saving edited vocab:', e);
    return getEditedVocabMap();
  }
}

export function removeEditedVocabItem(id) {
  try {
    const current = { ...getEditedVocabMap() };
    delete current[id];
    editedVocabMemoryCache = current;
    localStorage.setItem(EDITED_VOCAB_KEY, JSON.stringify(current));
    return current;
  } catch (e) {
    console.error('Error restoring edited vocab:', e);
    return getEditedVocabMap();
  }
}

export function getAiLookupHistory() {
  try {
    const saved = localStorage.getItem(AI_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveAiLookupHistory(record) {
  try {
    const list = getAiLookupHistory();
    const filtered = list.filter(
      (item) => item.query.trim().toLowerCase() !== record.query.trim().toLowerCase()
    );
    const updated = [record, ...filtered].slice(0, 20);
    localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving history:', e);
    return [];
  }
}

export function clearAiLookupHistory() {
  try {
    localStorage.removeItem(AI_HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}

function cleanJsonString(str) {
  if (!str) return '{}';
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  }
  return cleaned.trim();
}

// ====================================================================
// KIỂM TRA KẾT NỐI AI API
// ====================================================================
export async function testAiConnection(config) {
  const { provider, apiKey, model } = config;
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'Vui lòng nhập API Key.' };
  }

  try {
    if (provider === 'gemini') {
      let targetModel = model || 'gemini-3.8-flash';
      if (targetModel === 'gemini-2.5-flash') {
        targetModel = 'gemini-3.8-flash';
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;

      const generationConfig = {
        maxOutputTokens: 10,
        temperature: 0.1,
      };
      if (targetModel.includes('gemini-3.8') || targetModel.includes('gemini-2.5')) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Trả lời đúng 1 chữ: OK' }] }],
          generationConfig,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Lỗi HTTP ${res.status}: ${res.statusText}`;
        return { success: false, message: `Kết nối Gemini thất bại: ${errMsg}` };
      }

      const data = await res.json();
      if (data.candidates && data.candidates.length > 0) {
        return {
          success: true,
          message: `Kết nối Gemini (${targetModel}) thành công! Phản hồi tức thì.`,
        };
      }
      return { success: false, message: 'Gemini không trả về phản hồi hợp lệ.' };
    } else if (provider === 'deepseek') {
      const targetModel = model || 'deepseek-chat';
      const url = 'https://api.deepseek.com/chat/completions';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Trả lời đúng 1 chữ: OK' }],
          max_tokens: 10,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Lỗi HTTP ${res.status}: ${res.statusText}`;
        return { success: false, message: `Kết nối DeepSeek thất bại: ${errMsg}` };
      }

      return { success: true, message: `Kết nối DeepSeek (${targetModel}) thành công!` };
    }

    return { success: false, message: 'Nhà cung cấp không hợp lệ.' };
  } catch (error) {
    return { success: false, message: `Lỗi kết nối mạng: ${error.message}` };
  }
}

// ====================================================================
// GỌI AI THỰC HIỆN PROMPT
// ====================================================================
async function callAiRaw(prompt, systemInstruction = '', signal = null) {
  const config = getAiConfig();
  const { provider, apiKey, model } = config;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chưa cài đặt API Key. Vui lòng mở Cài đặt AI (⚙️) ở góc trên để cấu hình.');
  }

  if (provider === 'gemini') {
    let targetModel = model || 'gemini-3.8-flash';
    if (targetModel === 'gemini-2.5-flash') {
      targetModel = 'gemini-3.8-flash';
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;

    const contents = [];
    if (systemInstruction) {
      contents.push({ role: 'user', parts: [{ text: `[HƯỚNG DẪN HỆ THỐNG]: ${systemInstruction}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Đã hiểu. Sẵn sàng trả về DUY NHẤT chuỗi JSON hợp lệ.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const generationConfig = {
      temperature: 0.2,
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
    };

    if (targetModel.includes('gemini-3.8') || targetModel.includes('gemini-2.5')) {
      generationConfig.thinkingConfig = {
        thinkingBudget: 0,
      };
    }

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          contents,
          generationConfig,
        }),
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Yêu cầu tra cứu AI đã được hủy.');
      }
      throw err;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (generationConfig.thinkingConfig && err.error?.message?.toLowerCase().includes('thinking')) {
        delete generationConfig.thinkingConfig;
        const retryRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({ contents, generationConfig }),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          return retryData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }
      throw new Error(err.error?.message || `Lỗi Gemini API (${res.status})`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (provider === 'deepseek') {
    const targetModel = model || 'deepseek-chat';
    const url = 'https://api.deepseek.com/chat/completions';

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        signal,
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        }),
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Yêu cầu tra cứu AI đã được hủy.');
      }
      throw err;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Lỗi DeepSeek API (${res.status})`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error('Nhà cung cấp AI không được hỗ trợ.');
}

// ====================================================================
// DỊCH & GIẢI THÍCH BẰNG AI
// ====================================================================
export async function explainWordOrPhraseWithAi(phrase, contextSentence = '', signal = null, bypassCache = false) {
  const target = phrase.trim();
  const cacheKey = contextSentence ? `${target}__${contextSentence.trim()}` : target;

  if (!bypassCache) {
    const cached = getCachedAiResult(cacheKey);
    if (cached) {
      return { ...cached, isCached: true };
    }
  }

  const systemInstruction = 'Giáo viên tiếng Nhật N5-N4. Trả về DUY NHẤT một chuỗi JSON hợp lệ theo đúng schema.';
  const prompt = `Phân tích từ: "${target}"${contextSentence ? ` (Ngữ cảnh: "${contextSentence}")` : ''}.
Schema JSON:
{
  "word_jp": "${target}",
  "reading": "hiragana",
  "meaning_vi": "nghĩa tiếng Việt ngắn gọn",
  "han_viet": "Âm Hán Việt",
  "grammar_notes": "1 câu ngắn giải thích dạng từ/ngữ pháp nếu có",
  "breakdown": [
    {"word":"thành phần","reading":"hiragana","han_viet":"Hán Việt","meaning":"nghĩa"}
  ]
}`;

  const raw = await callAiRaw(prompt, systemInstruction, signal);
  const cleaned = cleanJsonString(raw);
  const result = JSON.parse(cleaned);

  saveCachedAiResult(cacheKey, result);
  return result;
}

export async function translateAndAnalyzeWithAi(text, signal = null, bypassCache = false) {
  const target = text.trim();
  if (!target) throw new Error('Văn bản cần tra cứu không được để trống.');

  if (!bypassCache) {
    const cached = getCachedAiResult(target);
    if (cached) {
      return { ...cached, isCached: true };
    }
  }

  const systemInstruction = 'Chuyên gia dịch thuật & ngữ pháp Nhật-Việt N5-N4. Trả về DUY NHẤT một chuỗi JSON hợp lệ theo đúng schema.';
  const prompt = `Dịch & phân tích câu: "${target}"
Schema JSON:
{
  "input_text": "${target}",
  "source_lang": "ja|vi",
  "japanese_ruby_html": "<ruby>Kanji<rt>hiragana</rt></ruby>",
  "japanese_plain": "câu tiếng Nhật chuẩn",
  "reading_hiragana": "phiên âm hiragana toàn câu",
  "vietnamese_translation": "bản dịch tiếng Việt tự nhiên",
  "grammar_explanation": "1-2 câu giải thích ngữ pháp ngắn gọn, dễ hiểu",
  "breakdown": [
    {"word":"từ vựng/kanji","reading":"hiragana","han_viet":"Âm Hán Việt","meaning":"nghĩa tiếng Việt"}
  ]
}`;

  const raw = await callAiRaw(prompt, systemInstruction, signal);
  const cleaned = cleanJsonString(raw);
  const result = JSON.parse(cleaned);

  saveCachedAiResult(target, result);
  return result;
}
