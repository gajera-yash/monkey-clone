/* 
  NSFW Detector using global window.nsfwjs and window.tf
  This version bypasses Webpack 5 bundling issues by loading scripts via index.html CDN.
*/

let model = null;
let isModelLoading = false;

// Helpers to access globals
const getTf = () => window.tf;
const getNsfwjs = () => window.nsfwjs;

export const loadNsfwModel = async () => {
  if (model) return model;
  if (isModelLoading) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (model) {
          clearInterval(checkInterval);
          resolve(model);
        }
      }, 500);
    });
  }

  isModelLoading = true;
  try {
    const tf = getTf();
    const nsfwjs = getNsfwjs();

    if (!tf || !nsfwjs) {
        console.warn("[NSFW] Global dependencies not found yet, retrying in 2s...");
        await new Promise(r => setTimeout(r, 2000));
        return loadNsfwModel();
    }

    // Initialize backend
    await tf.setBackend('webgl');
    await tf.ready();
    
    console.log("[NSFW] Loading NSFWJS model from CDN shards...");
    // Using MobileNetV2 for balanced performance/accuracy
    const modelPath = 'https://cdn.jsdelivr.net/npm/nsfwjs@4.2.0/dist/models/mobilenet_v2/';
    model = await nsfwjs.load(modelPath, { type: 'layers' });
    
    console.log("[NSFW] Model loaded successfully via Global Window.");
    return model;
  } catch (error) {
    console.error("[NSFW] Error loading model:", error);
    return null;
  } finally {
    isModelLoading = false;
  }
};

export const checkVideoForNsfw = async (videoElement) => {
  if (!model) {
    return null;
  }
  
  if (!videoElement || videoElement.readyState !== 4) {
    return null; // Video not ready
  }

  try {
    const predictions = await model.classify(videoElement, 3);
    
    let isNsfw = false;
    let maxProbability = 0;
    let dominantClass = '';

    for (const p of predictions) {
      if ((p.className === 'Porn' || p.className === 'Hentai' || p.className === 'Sexy') && p.probability > 0.8) {
        isNsfw = true;
        if (p.probability > maxProbability) {
            maxProbability = p.probability;
            dominantClass = p.className;
        }
      }
    }

    return {
      isNsfw,
      dominantClass,
      probability: (maxProbability * 100).toFixed(2),
      raw: predictions
    };
  } catch (error) {
    console.error("[NSFW] Error classifying video:", error);
    return null;
  }
};
