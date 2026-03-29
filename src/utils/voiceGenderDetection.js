/**
 * Voice Gender Detection Utility
 * 
 * Uses the browser's native AudioContext + Autocorrelation pitch detection
 * to estimate the fundamental frequency (F0) of a voice recording.
 * 
 * Male voices:   ~85 Hz – 180 Hz
 * Female voices:  ~165 Hz – 300 Hz
 * 
 * Threshold: 165 Hz  (above = female, at or below = male)
 */

const FEMALE_PITCH_THRESHOLD = 165; // Hz

/**
 * Autocorrelation-based pitch detection on a single audio buffer.
 * Returns the detected fundamental frequency in Hz, or 0 if no pitch found.
 */
function detectPitchFromBuffer(buffer, sampleRate) {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);

  // Only analyse if there is enough signal energy (skip silence)
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return 0; // too quiet / silence

  // Autocorrelation
  const correlations = new Float32Array(MAX_SAMPLES);
  for (let lag = 0; lag < MAX_SAMPLES; lag++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }

  // Find the first dip then the next peak — that gives us the period
  let foundDip = false;
  let bestLag = -1;
  let bestCorrelation = -1;

  // Min lag corresponds to max detectable frequency (~500 Hz safety cap)
  const minLag = Math.floor(sampleRate / 500);
  // Max lag corresponds to min detectable frequency (~50 Hz)
  const maxLag = Math.floor(sampleRate / 50);

  for (let lag = minLag; lag < Math.min(maxLag, MAX_SAMPLES); lag++) {
    if (!foundDip && correlations[lag] < correlations[lag - 1]) {
      foundDip = true;
    }
    if (foundDip && correlations[lag] > bestCorrelation) {
      bestCorrelation = correlations[lag];
      bestLag = lag;
    }
  }

  if (bestLag === -1) return 0;

  // Parabolic interpolation for sub-sample accuracy
  const prev = correlations[bestLag - 1] || 0;
  const curr = correlations[bestLag];
  const next = correlations[bestLag + 1] || 0;
  const shift = (prev - next) / (2 * (prev - 2 * curr + next));
  const refinedLag = bestLag + (isFinite(shift) ? shift : 0);

  return sampleRate / refinedLag;
}

/**
 * Analyse an audio Blob and determine voice gender.
 * 
 * @param {Blob} audioBlob - The recorded audio blob (webm, wav, etc.)
 * @returns {Promise<{ gender: 'female'|'male', pitchHz: number, confidence: number }>}
 */
export async function analyzeVoiceGender(audioBlob) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Work with the first channel
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Split audio into overlapping frames of ~50ms and detect pitch in each
    const frameSize = Math.floor(sampleRate * 0.05); // 50ms frames
    const hopSize = Math.floor(frameSize / 2);       // 50% overlap
    const pitches = [];

    for (let start = 0; start + frameSize < channelData.length; start += hopSize) {
      const frame = channelData.slice(start, start + frameSize);
      const pitch = detectPitchFromBuffer(frame, sampleRate);

      // Only keep valid human-range pitches (50–500 Hz)
      if (pitch > 50 && pitch < 500) {
        pitches.push(pitch);
      }
    }

    // Not enough voiced frames — cannot determine
    if (pitches.length < 3) {
      return { gender: 'unknown', pitchHz: 0, confidence: 0 };
    }

    // Remove outliers: discard lowest and highest 10%
    pitches.sort((a, b) => a - b);
    const trimCount = Math.floor(pitches.length * 0.1);
    const trimmed = pitches.slice(trimCount, pitches.length - trimCount);

    // Average pitch
    const avgPitch = trimmed.reduce((sum, p) => sum + p, 0) / trimmed.length;

    // Confidence: how far the average is from the threshold
    // At threshold (165Hz) → 50%. At 250Hz → ~85%. At 100Hz → ~85%.
    const distanceFromThreshold = Math.abs(avgPitch - FEMALE_PITCH_THRESHOLD);
    const maxDistance = 100; // normalisation factor
    const confidence = Math.min(0.5 + (distanceFromThreshold / maxDistance) * 0.5, 0.99);

    const gender = avgPitch > FEMALE_PITCH_THRESHOLD ? 'female' : 'male';

    console.log(`🎤 Voice Analysis: avgPitch=${avgPitch.toFixed(1)}Hz, gender=${gender}, confidence=${(confidence * 100).toFixed(0)}%`);

    return { gender, pitchHz: Math.round(avgPitch), confidence };
  } finally {
    await audioContext.close();
  }
}
