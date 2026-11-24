import React from 'react';

/**
 * Loại bỏ phiên âm Hiragana trong thẻ <rt> và ngoặc đơn
 * để Web Speech API đọc tiếng Nhật tự nhiên, không bị lặp âm hoặc đọc dính thẻ HTML.
 */
export function cleanForTTS(text) {
  if (!text) return '';
  return text
    .replace(/<rt>[\s\S]*?<\/rt>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim();
}

/**
 * Chuẩn hóa chuỗi HTML chứa <ruby> (loại bỏ <rb>, <rp>, và thẻ HTML lạ không an toàn)
 * để chỉ còn lại dạng chuẩn <ruby>Kanji<rt>furigana</rt></ruby> hoặc văn bản thuần.
 */
function normalizeRubyHtml(text) {
  return text
    .replace(/<rp>[\s\S]*?<\/rp>/gi, '')
    .replace(/<\/?rb>/gi, '')
    .replace(/<(?!\/?(?:ruby|rt)\b)[^>]*>/gi, '');
}

/**
 * Tách văn bản chứa <ruby>Kanji<rt>furigana</rt></ruby> hoặc Kanji（furigana） thành các node React.
 * Sử dụng màu kế thừa (text-inherit) để hiển thị rõ nét trên cả nền sáng, nền tối và dark mode.
 */
export function renderJapaneseWithFurigana(text, showFurigana = true) {
  if (!text) return null;

  const normalized = normalizeRubyHtml(String(text));

  const rubyTagRegex = /<ruby>\s*([^<]+?)\s*<rt>\s*([^<]+?)\s*<\/rt>\s*<\/ruby>/gi;
  const parenRegex = /([一-龯々〆ヵヶ0-9A-Za-z]+)[（(]([ぁ-んァ-ヶー0-9]+)[）)]/g;

  if (!showFurigana) {
    return normalized
      .replace(rubyTagRegex, '$1')
      .replace(parenRegex, '$1');
  }

  const combinedRegex = /<ruby>\s*([^<]+?)\s*<rt>\s*([^<]+?)\s*<\/rt>\s*<\/ruby>|([一-龯々〆ヵヶ0-9A-Za-z]+)[（(]([ぁ-んァ-ヶー0-9]+)[）)]/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(normalized.substring(lastIndex, match.index));
    }

    const kanji = match[1] || match[3];
    const furigana = match[2] || match[4];

    parts.push(
      <ruby key={`${match.index}-${kanji}`} className="inline-ruby mx-[1px] leading-tight group">
        <span className="font-semibold text-current group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">
          {kanji}
        </span>
        <rt className="text-[0.58em] text-indigo-600/90 dark:text-indigo-300/90 font-medium select-none px-0.5">
          {furigana}
        </rt>
      </ruby>
    );

    lastIndex = combinedRegex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    parts.push(normalized.substring(lastIndex));
  }

  return parts;
}
