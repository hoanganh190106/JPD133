// Dịch vụ tra cứu giáo trình (với Map index O(1)) + re-export các hàm gọi AI nhẹ từ aiClient
import vocabData from '../data/vocabulary_b1_11.json';
import readingPassagesData from '../data/reading_passages.json';
import kanjiData from '../data/kanji_b1_11.json';
import { getCustomVocab, getDeletedVocabIds, getEditedVocabMap } from './aiClient';

export * from './aiClient';

// ====================================================================
// CHỈ MỤC TRA CỨU NHANH (Lazy-built Map để tránh quét tuyến tính mỗi lần gọi)
// ====================================================================
let indexes = null;

function getIndexes() {
  if (indexes) return indexes;

  const kanjiByChar = new Map();
  const kanjiByHanViet = new Map();
  for (const k of kanjiData) {
    kanjiByChar.set(k.kanji, k);
    if (k.han_viet) {
      kanjiByHanViet.set(k.han_viet.toLowerCase(), k);
    }
  }

  const vocabByExact = new Map();
  const vocabByMeaning = new Map();
  for (const v of vocabData) {
    const w = v.word_jp?.replace(/\s+/g, '');
    const r = v.reading?.replace(/\s+/g, '');
    if (v.word_jp && !vocabByExact.has(v.word_jp)) vocabByExact.set(v.word_jp, v);
    if (w && !vocabByExact.has(w)) vocabByExact.set(w, v);
    if (v.reading && !vocabByExact.has(v.reading)) vocabByExact.set(v.reading, v);
    if (r && !vocabByExact.has(r)) vocabByExact.set(r, v);
    if (v.meaning_vi) {
      const mLower = v.meaning_vi.toLowerCase().trim();
      const mNoSpace = mLower.replace(/\s+/g, '');
      if (!vocabByMeaning.has(mLower)) vocabByMeaning.set(mLower, v);
      if (!vocabByMeaning.has(mNoSpace)) vocabByMeaning.set(mNoSpace, v);
    }
  }

  indexes = { kanjiByChar, kanjiByHanViet, vocabByExact, vocabByMeaning };
  return indexes;
}

function findKanjiInfoInWord(word) {
  if (!word) return null;
  const { kanjiByChar } = getIndexes();
  for (const ch of word) {
    const found = kanjiByChar.get(ch);
    if (found) return found;
  }
  return null;
}

// ====================================================================
// PHẦN 1: TỰ ĐỘNG TRA CỨU GIÁO TRÌNH NỘI BỘ (0ms - Miễn phí)
// ====================================================================
export function searchInCurriculum(query) {
  if (!query || !query.trim()) return null;
  const q = query.trim();
  const qLower = q.toLowerCase();
  const qNoSpace = q.replace(/\s+/g, '');
  const qNoSpaceLower = qLower.replace(/\s+/g, '');

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 3 || q.length > 25) {
    return null;
  }

  const { kanjiByChar, kanjiByHanViet, vocabByExact, vocabByMeaning } = getIndexes();

  // 0. Tra cứu 119 chữ Kanji Bài 1 - Bài 11
  const kDirect =
    kanjiByChar.get(q) ||
    kanjiByChar.get(qNoSpace) ||
    kanjiByHanViet.get(qLower) ||
    kanjiByHanViet.get(qNoSpaceLower);

  if (kDirect) {
    const reading =
      kDirect.kun_reading && kDirect.kun_reading !== '—'
        ? kDirect.kun_reading
        : kDirect.on_reading;
    return {
      isFromCurriculum: true,
      source: `Kanji Bài ${kDirect.lesson} (${kDirect.han_viet})`,
      input_text: q,
      source_lang: /[\u3400-\u4dbf\u4e00-\u9fff]/.test(q) ? 'ja' : 'vi',
      japanese_ruby_html: `<ruby>${kDirect.kanji}<rt>${kDirect.han_viet}</rt></ruby>`,
      japanese_plain: kDirect.kanji,
      reading_hiragana: reading,
      vietnamese_translation: `${kDirect.meaning} (Âm Hán Việt: ${kDirect.han_viet})`,
      grammar_explanation: `Chữ Hán thuộc phạm vi Bài ${kDirect.lesson}. Âm Kun: ${kDirect.kun_reading || '—'} • Âm On: ${kDirect.on_reading || '—'}. Nghĩa: ${kDirect.meaning}.`,
      breakdown: [
        {
          word: kDirect.kanji,
          reading,
          han_viet: kDirect.han_viet,
          meaning: kDirect.meaning,
        },
        ...(kDirect.examples || []).slice(0, 4).map((ex) => ({
          word: ex.word,
          reading: ex.reading,
          han_viet: '',
          meaning: ex.meaning || kDirect.meaning,
        })),
      ],
    };
  }

  // 1. Tìm trong kho từ vựng Bài 1 - Bài 11 (bỏ qua từ đã xóa, ưu tiên bản đã sửa)
  const deletedIds = getDeletedVocabIds();
  const editedMap = getEditedVocabMap();
  let matchedVocab =
    vocabByExact.get(q) ||
    vocabByExact.get(qNoSpace) ||
    vocabByMeaning.get(qLower) ||
    vocabByMeaning.get(qNoSpaceLower);

  if (matchedVocab && deletedIds.has(matchedVocab.id)) {
    matchedVocab = null;
  }

  if (!matchedVocab && q.length >= 2) {
    matchedVocab = vocabData.find(
      (v) => !deletedIds.has(v.id) && (v.word_jp.includes(q) || v.reading.includes(q))
    );
  }

  if (matchedVocab && editedMap[matchedVocab.id]) {
    matchedVocab = { ...matchedVocab, ...editedMap[matchedVocab.id] };
  }

  if (matchedVocab) {
    const isKanji = /[\u3400-\u4dbf\u4e00-\u9fff]/.test(matchedVocab.word_jp);
    const rubyHtml =
      isKanji && matchedVocab.reading && matchedVocab.reading !== matchedVocab.word_jp
        ? `<ruby>${matchedVocab.word_jp}<rt>${matchedVocab.reading}</rt></ruby>`
        : matchedVocab.word_jp;

    return {
      isFromCurriculum: true,
      source: `Bài ${matchedVocab.lesson} (${matchedVocab.topic})`,
      input_text: q,
      source_lang: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(q) ? 'ja' : 'vi',
      japanese_ruby_html: rubyHtml,
      japanese_plain: matchedVocab.word_jp,
      reading_hiragana: matchedVocab.reading,
      vietnamese_translation: matchedVocab.meaning_vi,
      example_jp: matchedVocab.example_jp,
      example_vi: matchedVocab.example_vi,
      grammar_explanation: matchedVocab.example_jp
        ? `Câu ví dụ giáo trình: "${matchedVocab.example_jp}" (${matchedVocab.example_vi}). Thuộc Bài ${matchedVocab.lesson}, chủ đề "${matchedVocab.topic}".`
        : `Từ vựng cốt lõi Bài ${matchedVocab.lesson}, chủ đề "${matchedVocab.topic}".`,
      breakdown: [
        {
          word: matchedVocab.word_jp,
          reading: matchedVocab.reading,
          han_viet: '',
          meaning: matchedVocab.meaning_vi,
        },
      ],
    };
  }

  // 2. Tìm trong 16 bài luyện đọc
  for (const passage of readingPassagesData) {
    if (passage.kanji_check && passage.kanji_check.length > 0) {
      const kMatch = passage.kanji_check.find(
        (k) =>
          k.word === q ||
          k.reading === q ||
          k.meaning.toLowerCase().trim() === qLower ||
          k.word.replace(/\s+/g, '') === qNoSpace ||
          k.meaning.toLowerCase().replace(/\s+/g, '') === qNoSpaceLower
      );
      if (kMatch) {
        return {
          isFromCurriculum: true,
          source: `${passage.title} (${kMatch.lesson || 'Kanji Bài 8-11'})`,
          input_text: q,
          source_lang: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(q) ? 'ja' : 'vi',
          japanese_ruby_html: `<ruby>${kMatch.word}<rt>${kMatch.reading}</rt></ruby>`,
          japanese_plain: kMatch.word,
          reading_hiragana: kMatch.reading,
          vietnamese_translation: kMatch.meaning,
          grammar_explanation: `Chữ Hán thuộc phạm vi ${kMatch.lesson || 'Bài 8-11'}, xuất hiện trong ${passage.title}.`,
          breakdown: [
            {
              word: kMatch.word,
              reading: kMatch.reading,
              han_viet: '',
              meaning: kMatch.meaning,
            },
          ],
        };
      }
    }

    if (passage.all_kanji_words && passage.all_kanji_words.length > 0) {
      const akMatch = passage.all_kanji_words.find(
        (k) =>
          k.word === q ||
          k.reading === q ||
          k.meaning.toLowerCase().trim() === qLower ||
          k.word.replace(/\s+/g, '') === qNoSpace
      );
      if (akMatch) {
        return {
          isFromCurriculum: true,
          source: `${passage.title} (Từ Kanji bài đọc)`,
          input_text: q,
          source_lang: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(q) ? 'ja' : 'vi',
          japanese_ruby_html: `<ruby>${akMatch.word}<rt>${akMatch.reading}</rt></ruby>`,
          japanese_plain: akMatch.word,
          reading_hiragana: akMatch.reading,
          vietnamese_translation: akMatch.meaning,
          grammar_explanation: `Từ vựng chữ Hán xuất hiện trong bài đọc "${passage.title}".`,
          breakdown: [
            {
              word: akMatch.word,
              reading: akMatch.reading,
              han_viet: '',
              meaning: akMatch.meaning,
            },
          ],
        };
      }
    }
  }

  // 3. Kiểm tra trong danh sách Flashcard cá nhân đã lưu
  const customList = getCustomVocab();
  const cMatch = customList.find(
    (c) =>
      (c.word_jp && (c.word_jp === q || c.word_jp.replace(/\s+/g, '') === qNoSpace)) ||
      (c.reading && c.reading === q) ||
      (c.meaning_vi && c.meaning_vi.toLowerCase().trim() === qLower)
  );
  if (cMatch) {
    return {
      isFromCurriculum: true,
      source: 'Flashcard cá nhân (Đã lưu)',
      input_text: q,
      source_lang: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(q) ? 'ja' : 'vi',
      japanese_ruby_html: cMatch.reading
        ? `<ruby>${cMatch.word_jp}<rt>${cMatch.reading}</rt></ruby>`
        : cMatch.word_jp,
      japanese_plain: cMatch.word_jp,
      reading_hiragana: cMatch.reading,
      vietnamese_translation: cMatch.meaning_vi,
      grammar_explanation: cMatch.grammar || 'Từ vựng đã lưu vào bộ nhớ Flashcard.',
      breakdown: [
        {
          word: cMatch.word_jp,
          reading: cMatch.reading,
          han_viet: cMatch.han_viet || '',
          meaning: cMatch.meaning_vi,
        },
      ],
    };
  }

  return null;
}

// Tra cứu cục bộ cho ReadingPracticeCard (2 tầng: Tài liệu trước - AI sau)
export function searchInLocalKnowledge(query, currentPassage, allVocabList) {
  if (!query || !query.trim()) return null;
  const q = query.trim().replace(/\s+/g, '');
  const { kanjiByChar, vocabByExact } = getIndexes();

  // 1. 1 chữ Kanji đơn lẻ nằm trong 119 chữ Bài 1-11
  const exactKanji = kanjiByChar.get(q);
  if (exactKanji) {
    return {
      isKanji: true,
      word: exactKanji.kanji,
      kanji: exactKanji.kanji,
      han_viet: exactKanji.han_viet,
      on_reading: exactKanji.on_reading,
      kun_reading: exactKanji.kun_reading,
      reading:
        exactKanji.kun_reading && exactKanji.kun_reading !== '—'
          ? exactKanji.kun_reading
          : exactKanji.on_reading,
      meaning: exactKanji.meaning,
      lesson: exactKanji.lesson,
      examples: exactKanji.examples || [],
      source: `Kanji Bài ${exactKanji.lesson}`,
      sourceType: 'local',
    };
  }

  // 2. all_kanji_words của bài đọc hiện tại
  if (currentPassage && currentPassage.all_kanji_words) {
    const found = currentPassage.all_kanji_words.find(
      (item) => item.word.replace(/\s+/g, '') === q
    );
    if (found) {
      const kInfo = findKanjiInfoInWord(found.word);
      return {
        word: found.word,
        reading: found.reading,
        meaning: found.meaning,
        han_viet: kInfo ? kInfo.han_viet : '',
        source: 'Bài đọc hiện tại (all_kanji_words)',
        sourceType: 'local',
      };
    }
  }

  // 3. kanji_check của bài đọc hiện tại
  if (currentPassage && currentPassage.kanji_check) {
    const found = currentPassage.kanji_check.find(
      (item) => item.word.replace(/\s+/g, '') === q
    );
    if (found) {
      const kInfo = findKanjiInfoInWord(found.word);
      return {
        word: found.word,
        reading: found.reading,
        meaning: found.meaning,
        han_viet: kInfo ? kInfo.han_viet : '',
        source: `Kanji ${found.lesson || 'Bài 8-11'}`,
        sourceType: 'local',
      };
    }
  }

  // 4. Khớp chính xác trong kho từ vựng Bài 1-11 (O(1) nếu dùng kho mặc định, bỏ qua từ đã xóa, ưu tiên bản đã sửa)
  const deletedIds = getDeletedVocabIds();
  const editedMap = getEditedVocabMap();
  const useDefaultVocab = !allVocabList || allVocabList.length === 0 || allVocabList === vocabData;
  let exact = useDefaultVocab
    ? vocabByExact.get(q)
    : allVocabList.find(
        (item) =>
          !deletedIds.has(item.id) &&
          (item.word_jp.replace(/\s+/g, '') === q || item.reading.replace(/\s+/g, '') === q)
      );
  if (exact && deletedIds.has(exact.id)) {
    exact = null;
  }

  if (exact) {
    const resolved = editedMap[exact.id] ? { ...exact, ...editedMap[exact.id] } : exact;
    const kInfo = findKanjiInfoInWord(resolved.word_jp);
    return {
      word: resolved.word_jp,
      reading: resolved.reading,
      meaning: resolved.meaning_vi,
      han_viet: resolved.han_viet || (kInfo ? kInfo.han_viet : ''),
      source: `Từ vựng Bài ${resolved.lesson}`,
      sourceType: 'local',
    };
  }

  // 5. Khớp một phần trong kho từ vựng
  const vocabListToSearch = useDefaultVocab ? vocabData : allVocabList;
  if (q.length >= 2) {
    const partial = vocabListToSearch.find((item) => {
      if (deletedIds.has(item.id)) return false;
      const wClean = item.word_jp.replace(/\s+/g, '');
      return wClean.length >= 2 && (wClean.includes(q) || q.includes(wClean));
    });
    if (partial) {
      const resolved = editedMap[partial.id] ? { ...partial, ...editedMap[partial.id] } : partial;
      const kInfo = findKanjiInfoInWord(resolved.word_jp);
      return {
        word: resolved.word_jp,
        reading: resolved.reading,
        meaning: resolved.meaning_vi,
        han_viet: resolved.han_viet || (kInfo ? kInfo.han_viet : ''),
        source: `Từ vựng Bài ${resolved.lesson}`,
        sourceType: 'local',
      };
    }
  }

  // 6. Chứa ít nhất 1 chữ Kanji nằm trong 119 chữ Bài 1-11
  const kanjiChars = q.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g);
  if (kanjiChars && kanjiChars.length > 0) {
    for (const char of kanjiChars) {
      const kFound = kanjiByChar.get(char);
      if (kFound) {
        const exMatch = kFound.examples?.find(
          (e) => e.word === q || q.includes(e.word) || e.word.includes(q)
        );
        return {
          isKanji: true,
          word: q,
          kanji: kFound.kanji,
          han_viet: kFound.han_viet,
          on_reading: kFound.on_reading,
          kun_reading: kFound.kun_reading,
          reading:
            exMatch?.reading ||
            (kFound.kun_reading && kFound.kun_reading !== '—'
              ? kFound.kun_reading
              : kFound.on_reading),
          meaning:
            exMatch?.meaning ||
            `${kFound.meaning} (chứa Hán tự ${kFound.kanji} - ${kFound.han_viet})`,
          lesson: kFound.lesson,
          examples: kFound.examples || [],
          source: `Chứa Kanji Bài ${kFound.lesson} (${kFound.kanji} - ${kFound.han_viet})`,
          sourceType: 'local',
        };
      }
    }
  }

  // 7. Flashcard cá nhân đã lưu
  const customList = getCustomVocab();
  const customFound = customList.find(
    (item) =>
      (item.word_jp && item.word_jp.replace(/\s+/g, '') === q) ||
      (item.reading && item.reading.replace(/\s+/g, '') === q)
  );
  if (customFound) {
    return {
      word: customFound.word_jp,
      reading: customFound.reading,
      meaning: customFound.meaning_vi,
      source: 'Từ đã lưu trong Flashcard',
      sourceType: 'local',
    };
  }

  return null;
}
