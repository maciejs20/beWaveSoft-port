// Picture work of the TSH microSD tools in the renderer (PROJEKT-TSH-EDYTOR.md "Karta microSD"): decoding by the
// browser (JPG, BMP, PNG), drawing on canvas and JPEG encoding, so macOS and Linux give the same files without native
// libraries. Geometry and names come from tshSdCard.js; files are written through window.electronAPI.tshSd*.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pickImageFiles = exports.canvasToJpeg = exports.renderCrop = exports.renderSlide = exports.decodeImage =
  exports.IMAGE_ACCEPT = undefined;
var TshSdCard = require("./tshSdCard.js");
// File types offered in the open dialog (TSH: JPG and BMP; PNG costs nothing with the browser decoder).
var IMAGE_ACCEPT = exports.IMAGE_ACCEPT = ".jpg,.jpeg,.bmp,.png,image/jpeg,image/bmp,image/png";
// Decodes a picture file. Returns a Promise of an ImageBitmap (width, height); rejects when it is not a picture.
exports.decodeImage = function (file) {
  return createImageBitmap(file);
};
// New canvas of the keypad size with smooth scaling. Returns { canvas, ctx }.
var keypadCanvas = function (width, height) {
  var canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return {
    canvas: canvas,
    ctx: ctx
  };
};
// Slideshow picture on a black keypad screen, placed as TSH does (tshSdCard.slideRect). Returns the canvas.
exports.renderSlide = function (bitmap, width, height) {
  var c = keypadCanvas(width, height);
  var r = TshSdCard.slideRect(bitmap.width, bitmap.height, width, height);
  c.ctx.fillStyle = "#000000";
  c.ctx.fillRect(0, 0, width, height);
  c.ctx.drawImage(bitmap, r.x, r.y, r.width, r.height);
  return c.canvas;
};
// Crop rectangle (picture px) stretched to the keypad screen, as TSH's Kadrowanie OK does. Returns the canvas.
exports.renderCrop = function (bitmap, rect, width, height) {
  var c = keypadCanvas(width, height);
  c.ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
  return c.canvas;
};
// Baseline JPEG of a canvas at TSH's quality, with only the JFIF header like TSH's files. Returns a Promise of
// { bytes: Uint8Array, blob: Blob }.
exports.canvasToJpeg = function (canvas) {
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (!blob) {
        reject(new Error("JPEG encoding failed"));
        return;
      }
      blob.arrayBuffer().then(function (buffer) {
        var bytes = TshSdCard.stripJpegMetadata(new Uint8Array(buffer));
        resolve({
          bytes: bytes,
          blob: new Blob([bytes], {
            type: "image/jpeg"
          })
        });
      }, reject);
    }, "image/jpeg", TshSdCard.JPEG_QUALITY);
  });
};
// Opens the system file dialog for pictures. Returns a Promise of File[] ([] when cancelled).
exports.pickImageFiles = function (multiple) {
  return new Promise(function (resolve) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_ACCEPT;
    input.multiple = !!multiple;
    input.addEventListener("change", function () {
      resolve(Array.from(input.files ?? []));
    });
    input.addEventListener("cancel", function () {
      resolve([]);
    });
    input.click();
  });
};
