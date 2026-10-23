import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'europe-west1' });

export { createSebExam } from './src/createSebExam.js';
export { signSebSubmission } from './src/signSebSubmission.js';
