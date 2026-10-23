/**
 * useMyExams.js
 * «Mine prøver»: lærerens egne prøver huskes kun lokalt i nettleseren (localStorage).
 */
import { useCallback, useState } from 'react';

const KEY = 'seb_teacher_my_exams_v1';
const MAX = 50;

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    const now = Date.now();
    return Array.isArray(list) ? list.filter((e) => !e.expiresAt || Date.parse(e.expiresAt) > now) : [];
  } catch {
    return [];
  }
}

export function useMyExams() {
  const [exams, setExams] = useState(read);

  const persist = (list) => {
    setExams(list);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* lagring full eller sperret */
    }
  };

  const addExam = useCallback((exam) => {
    persist([exam, ...read().filter((e) => e.examId !== exam.examId)].slice(0, MAX));
  }, []);

  const removeExam = useCallback((examId) => {
    persist(read().filter((e) => e.examId !== examId));
  }, []);

  return { exams, addExam, removeExam };
}
