/**
 * cleanupExamStorage.js
 * Automatisk opprydding i Cloud Storage når et prøvedokument i Firestore slettes.
 * Sikrer at eventuelle vedlagte oppgave-PDF-er fjernes når Firestore TTL sletter
 * prøven etter 90 dager, eller dersom et dokument slettes manuelt.
 */
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getStorage } from 'firebase-admin/storage';

export const cleanupExamStorage = onDocumentDeleted(
  {
    document: 'sebExams/{examId}',
    region: 'europe-west1',
    maxInstances: 5
  },
  async (event) => {
    const examId = event.params.examId;
    if (!examId) return;

    const data = event.data?.data();
    const pdfPath = data?.pdfPath || `sebExams/${examId}/oppgave.pdf`;

    try {
      const bucket = getStorage().bucket('voxcuriosa-seb-storage');
      const file = bucket.file(pdfPath);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
      }
      // Sletter eventuelle andre restfiler i samme prøvemappe i Storage
      await bucket.deleteFiles({ prefix: `sebExams/${examId}/`, force: true });
    } catch (err) {
      console.warn(`Opprydding av storage for ${examId} fullforte med merknad:`, err?.message);
    }
  }
);
