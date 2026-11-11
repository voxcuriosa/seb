/**
 * cleanupExamStorage.js
 * Automatisk opprydding i Cloud Storage og sebExamContent når et prøvedokument i
 * Firestore slettes. Sikrer at tilhørende oppgaveinnhold og oppgave-PDF-er fjernes
 * når Firestore TTL sletter prøven etter 90 dager, eller ved manuell sletting.
 */
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { isValidExamId } from './validate.js';

export const cleanupExamStorage = onDocumentDeleted(
  {
    document: 'sebExams/{examId}',
    region: 'europe-west1',
    maxInstances: 5,
    retry: true
  },
  async (event) => {
    const examId = event.params.examId;
    if (!isValidExamId(examId)) return;

    const data = event.data?.data();
    const bucketName = process.env.SEB_STORAGE_BUCKET || 'voxcuriosa-seb-storage';

    try {
      const db = getFirestore();
      const contentRef = db.collection('sebExamContent').doc(examId);
      const contentSnap = await contentRef.get();
      const storedPdfPath =
        (contentSnap.exists ? contentSnap.get('pdfPath') : null) ||
        data?.pdfPath ||
        null;

      await contentRef.delete();

      const bucket = getStorage().bucket(bucketName);
      if (typeof storedPdfPath === 'string' && storedPdfPath.startsWith(`sebExams/${examId}/`)) {
        try {
          await bucket.file(storedPdfPath).delete();
        } catch (storageErr) {
          if (storageErr?.code !== 404 && Number(storageErr?.code) !== 404) throw storageErr;
        }
      }

      try {
        // Sletter alle filer under prøvemappen i Storage (både tilfeldig PDF-filnavn og ev. eldre oppgave.pdf)
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
