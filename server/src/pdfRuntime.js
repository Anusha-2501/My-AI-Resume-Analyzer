import canvas from "@napi-rs/canvas";

if (!globalThis.DOMMatrix) globalThis.DOMMatrix = canvas.DOMMatrix;
if (!globalThis.ImageData) globalThis.ImageData = canvas.ImageData;
if (!globalThis.Path2D) globalThis.Path2D = canvas.Path2D;
