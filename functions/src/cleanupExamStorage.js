/**
 * cleanupExamStorage.js
 * Automatisk opprydding i Cloud Storage og sebExamContent når et prøvedokument i
 * Firestore slettes. Sikrer at tilhørende oppgaveinnhold og oppgave-PDF-er fjernes
 * når Firestore TTL sletter prøven etter 90 dager, eller ved manuell sletting.
 */
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export const cleanupExamStorage = onDocumentDeleted(
  {
    document: 'sebExams/{examId}',
    region: 'europe-west1',
    maxInstances: 5,
    retry: true
  },
  async (event) => {
    const examId = event.params.examId;
    if (!examId) return;

    const data = event.data?.data();
    const pdfPath = data?.pdfPath || `sebExams/${examId}/oppgave.pdf`;
    const bucketName = process.env.SEB_STORAGE_BUCKET || 'voxcuriosa-seb-storage';

    try {
      const db = getFirestore();
      await db.collection('sebExamContent').doc(examId).delete();

      const bucket = getStorage().bucket(bucketName);
      try {
        const file = bucket.file(pdfPath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
        }
      } catch (storageErr) {
        if (storageErr?.code !== 404 && Number(storageErr?.code) !== 404) throw storageErr;
      }

      try {
        // Sletter eventuelle andre restfiler i samme prøvemappe i Storage
        await bucket.deleteFiles({ prefix: `sebExams/${examId}/`, force: true });
      } catch (prefixErr) {
        if (prefixErr?.code !== 404 && Number(prefixErr?.code) !== 404) throw prefixErr;
      }
    } catch (err) {
      console.error(`Kritisk feil under opprydding av prøve ${examId}:`, err);
      // Kaster feilen videre slik at Eventarc / Cloud Functions foretar automatisk retry
      throw err;
    }
  }
);
