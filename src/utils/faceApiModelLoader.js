import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadingPromise = null;

/**
 * Pre-loads all required face-api models if not already loaded.
 * Returns a promise that resolves when all models are ready.
 */
export const loadFaceModels = async () => {
    if (modelsLoaded) return true;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            console.log("[face-api] Starting background model load...");
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
            ]);
            modelsLoaded = true;
            console.log("[face-api] Models loaded successfully and cached.");
            return true;
        } catch (err) {
            console.error("[face-api] Error loading models:", err);
            loadingPromise = null; // Allow retry on failure
            throw err;
        }
    })();

    return loadingPromise;
};

/**
 * Synchronous check to see if models are already loaded.
 */
export const areModelsLoaded = () => modelsLoaded;
