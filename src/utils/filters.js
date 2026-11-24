export function filterImageQuestions(questions, { lessonFilter, statusFilter, searchQuery, progress }) {
  const query = searchQuery.trim().toLowerCase();
  return questions.filter((q) => {
    if (lessonFilter !== 'all' && q.lesson !== Number(lessonFilter)) {
      return false;
    }

    const itemStatus = progress[q.id] || 'unseen';
    if (statusFilter !== 'all' && itemStatus !== statusFilter) {
      return false;
    }

    if (query) {
      const idMatch =
        String(q.id) === query ||
        `hình ${q.id}`.includes(query) ||
        `hinh ${q.id}`.includes(query);
      const grammarMatch = q.grammar.toLowerCase().includes(query);
      const qaMatch = q.qa.some(
        (qa) =>
          qa.q_jp.toLowerCase().includes(query) ||
          qa.q_vi.toLowerCase().includes(query) ||
          qa.a_jp.toLowerCase().includes(query) ||
          qa.a_vi.toLowerCase().includes(query)
      );
      return idMatch || grammarMatch || qaMatch;
    }

    return true;
  });
}

export function filterNoImageQuestions(questions, { lessonFilter, statusFilter, searchQuery, progress }) {
  const query = searchQuery.trim().toLowerCase();
  return questions.filter((q) => {
    if (lessonFilter !== 'all' && q.lesson !== Number(lessonFilter)) {
      return false;
    }

    const itemStatus = progress[q.id] || 'unseen';
    if (statusFilter !== 'all' && itemStatus !== statusFilter) {
      return false;
    }

    if (query) {
      const idMatch =
        String(q.id) === query ||
        `câu ${q.id}`.includes(query) ||
        `cau ${q.id}`.includes(query);
      const grammarMatch =
        q.grammar.toLowerCase().includes(query) ||
        q.grammar_meaning.toLowerCase().includes(query);
      const textMatch =
        q.q_jp.toLowerCase().includes(query) ||
        q.q_vi.toLowerCase().includes(query) ||
        q.a_jp.toLowerCase().includes(query) ||
        q.a_vi.toLowerCase().includes(query);
      return idMatch || grammarMatch || textMatch;
    }

    return true;
  });
}

export function filterReadingPassages(passages, { groupFilter, statusFilter, searchQuery, progress }) {
  const query = searchQuery.trim().toLowerCase();
  return passages.filter((p) => {
    if (groupFilter !== 'all' && p.group !== groupFilter) {
      return false;
    }

    const itemStatus = progress[p.id] || 'unseen';
    if (statusFilter !== 'all' && itemStatus !== statusFilter) {
      return false;
    }

    if (query) {
      const idMatch =
        String(p.id) === query ||
        `bài ${p.id}`.includes(query) ||
        `bai ${p.id}`.includes(query);
      const titleMatch = p.title.toLowerCase().includes(query);
      const textMatch =
        p.jp_text.toLowerCase().includes(query) ||
        p.vi_text.toLowerCase().includes(query);
      return idMatch || titleMatch || textMatch;
    }

    return true;
  });
}
