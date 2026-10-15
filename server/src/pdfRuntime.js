import canvas from "@napi-rs/canvas";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

if (!globalThis.DOMMatrix) globalThis.DOMMatrix = canvas.DOMMatrix;
if (!globalThis.ImageData) globalThis.ImageData = canvas.ImageData;
if (!globalThis.Path2D) globalThis.Path2D = canvas.Path2D;

// pdf.js parses on a "fake worker" in Node and loads it with a computed dynamic
// import() that bundlers cannot trace, so on a deployed function the worker is
// missing and parsing fails with only "Setting up fake worker failed".
// Importing the worker statically lets the bundler include it, and pdf.js
// returns this handler before it ever reaches its own dynamic import.
globalThis.pdfjsWorker = pdfjsWorker;
