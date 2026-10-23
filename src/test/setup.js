import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// pdf.js i Node: pek workeren til den lokale modulen (fake worker i samme prosess).
const require = createRequire(import.meta.url);
const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
