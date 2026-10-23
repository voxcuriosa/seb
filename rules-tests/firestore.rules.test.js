import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, '..', 'firestore.rules');
const PROJECT_ID = 'demo-voxcuriosa-seb';

const VALID_ID = 'AbCdEfGhIjKlMnOpQrSt';
const EXPIRED_ID = 'ZyXwVuTsRqPoNmLkJiHg';

const DAY_MS = 24 * 60 * 60 * 1000;

function examData(id, expiresAt) {
  return {
    id,
    title: 'Test exam',
    createdAt: Timestamp.fromMillis(Date.now() - DAY_MS),
    expiresAt,
    sourceType: 'text',
    promptHtml: '<p>Hello</p>',
    pdfPath: null,
    sebConfig: {
      allowedApps: { calculator: true },
      allowedWebsites: ['https://example.com'],
      quitPasswordHash: 'abc123',
    },
    blocks: [],
    schemaVersion: 1,
  };
}

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(
      doc(db, 'sebExams', VALID_ID),
      examData(VALID_ID, Timestamp.fromMillis(Date.now() + 90 * DAY_MS)),
    );
    await setDoc(
      doc(db, 'sebExams', EXPIRED_ID),
      examData(EXPIRED_ID, Timestamp.fromMillis(Date.now() - DAY_MS)),
    );
    await setDoc(doc(db, 'rateLimits', 'some-ip'), { count: 1 });
    await setDoc(doc(db, 'other', 'doc1'), { foo: 'bar' });
  });
});

const unauthDb = () => testEnv.unauthenticatedContext().firestore();
const authDb = () => testEnv.authenticatedContext('fake-user').firestore();

describe('sebExams reads', () => {
  it('allows unauthenticated get of a valid, unexpired exam', async () => {
    await assertSucceeds(getDoc(doc(unauthDb(), 'sebExams', VALID_ID)));
  });

  it('denies get of an expired exam', async () => {
    await assertFails(getDoc(doc(unauthDb(), 'sebExams', EXPIRED_ID)));
    await assertFails(getDoc(doc(authDb(), 'sebExams', EXPIRED_ID)));
  });

  it('denies get of a non-existent exam', async () => {
    await assertFails(getDoc(doc(unauthDb(), 'sebExams', 'doesNotExist00000000')));
  });

  it('denies list queries (unauthenticated and authenticated)', async () => {
    await assertFails(getDocs(collection(unauthDb(), 'sebExams')));
    await assertFails(getDocs(collection(authDb(), 'sebExams')));
    await assertFails(
      getDocs(
        query(
          collection(unauthDb(), 'sebExams'),
          where('expiresAt', '>', Timestamp.now()),
          limit(1),
        ),
      ),
    );
  });
});

describe('sebExams writes', () => {
  for (const [label, getDb] of [
    ['unauthenticated', unauthDb],
    ['authenticated', authDb],
  ]) {
    it(`denies create (${label})`, async () => {
      const id = 'NewExamId00000000000';
      await assertFails(
        setDoc(
          doc(getDb(), 'sebExams', id),
          examData(id, Timestamp.fromMillis(Date.now() + DAY_MS)),
        ),
      );
    });

    it(`denies update (${label})`, async () => {
      await assertFails(
        updateDoc(doc(getDb(), 'sebExams', VALID_ID), { title: 'hacked' }),
      );
      await assertFails(
        updateDoc(doc(getDb(), 'sebExams', EXPIRED_ID), {
          expiresAt: Timestamp.fromMillis(Date.now() + 365 * DAY_MS),
        }),
      );
    });

    it(`denies delete (${label})`, async () => {
      await assertFails(deleteDoc(doc(getDb(), 'sebExams', VALID_ID)));
    });
  }
});

describe('rateLimits', () => {
  it('denies read and write for unauthenticated and authenticated clients', async () => {
    for (const db of [unauthDb(), authDb()]) {
      await assertFails(getDoc(doc(db, 'rateLimits', 'some-ip')));
      await assertFails(getDocs(collection(db, 'rateLimits')));
      await assertFails(setDoc(doc(db, 'rateLimits', 'some-ip'), { count: 0 }));
      await assertFails(setDoc(doc(db, 'rateLimits', 'new-ip'), { count: 0 }));
      await assertFails(deleteDoc(doc(db, 'rateLimits', 'some-ip')));
    }
  });
});

describe('default deny', () => {
  it('denies access to unknown collections and subcollections', async () => {
    for (const db of [unauthDb(), authDb()]) {
      await assertFails(getDoc(doc(db, 'other', 'doc1')));
      await assertFails(getDocs(collection(db, 'other')));
      await assertFails(setDoc(doc(db, 'other', 'doc2'), { foo: 'bar' }));
      await assertFails(getDoc(doc(db, 'sebExams', VALID_ID, 'sub', 'x')));
      await assertFails(setDoc(doc(db, 'sebExams', VALID_ID, 'sub', 'x'), { a: 1 }));
    }
  });
});
