(function() {
  "use strict";
  function applyFilterToImageData(imageData, filter) {
    const data = imageData.data;
    if (filter.brightness === 0 && filter.contrast === 0 && filter.saturation === 0) {
      return imageData;
    }
    const brightnessMultiplier = 1 + filter.brightness / 100;
    const contrastFactor = 259 * (filter.contrast + 255) / (255 * (259 - filter.contrast));
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      r *= brightnessMultiplier;
      g *= brightnessMultiplier;
      b *= brightnessMultiplier;
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      const satMultiplier = 1 + filter.saturation / 100;
      r = gray + satMultiplier * (r - gray);
      g = gray + satMultiplier * (g - gray);
      b = gray + satMultiplier * (b - gray);
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    return imageData;
  }
  self.onmessage = (e) => {
    const { type, id, imageData, filter } = e.data;
    try {
      const processedData = applyFilterToImageData(imageData, filter);
      const response = {
        type,
        id,
        imageData: processedData,
        success: true
      };
      self.postMessage(response, [processedData.data.buffer]);
    } catch (error) {
      const response = {
        type,
        id,
        imageData,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
      self.postMessage(response);
    }
  };
})();
