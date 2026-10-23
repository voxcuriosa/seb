import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherHub from './pages/TeacherHub';
import SebStart from './pages/SebStart';
import SebQuit from './pages/SebQuit';
import LoadingScreen from './components/common/LoadingScreen';

// Prøverommet er tungt (Tiptap, pdf.js, pdf-lib) og lastes bare ved behov.
const SebExamRoom = lazy(() => import('./pages/SebExamRoom'));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen label="Laster..." />}>
      <Routes>
        <Route path="/" element={<TeacherHub />} />
        <Route path="/start/:examId" element={<SebStart />} />
        <Route path="/exam/:examId" element={<SebExamRoom />} />
        <Route path="/quit" element={<SebQuit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
