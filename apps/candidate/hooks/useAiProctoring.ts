"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

/* ── External model libs loaded from CDN ─────────────── */
declare global {
  interface Window {
    tf?: any;
    cocoSsd?: any;
  }
}

const TFJS_URL =
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const COCO_URL =
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";

const DETECT_INTERVAL_MS = 3000; // run object detection every 3s
const NOISE_INTERVAL_MS = 1000; // sample audio every 1s
const TOAST_THROTTLE_MS = 8000; // same warning at most once per 8s
const SCORE_THRESHOLD = 0.55; // min confidence for object predictions
const NOISE_RMS_THRESHOLD = 0.18; // loudness threshold (0..1)
const NOISE_SUSTAIN = 3; // consecutive loud samples before warning

// COCO classes we treat as prohibited objects
const PROHIBITED_OBJECTS: Record<string, string> = {
  "cell phone": "Mobile phone detected",
  laptop: "Laptop / second device detected",
  book: "Book or printed material detected",
  tv: "Screen / monitor detected",
  remote: "Suspicious device detected",
};

function waitForGlobal(check: () => boolean, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (check()) {
      resolve();
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      if (check()) {
        clearInterval(id);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(id);
        reject(new Error("Timed out waiting for library global"));
      }
    }, 100);
  });
}

function loadScript(src: string, globalCheck: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${src}"]`
    ) as HTMLScriptElement | null;

    // Script tag already present (e.g. React re-mount): wait for the actual
    // global to be ready instead of resolving immediately.
    if (existing) {
      waitForGlobal(globalCheck).then(resolve).catch(reject);
      return;
    }

    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => waitForGlobal(globalCheck).then(resolve).catch(reject);
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

export type ProctoringStatus =
  | "disabled"
  | "initializing"
  | "active"
  | "error";

export interface AiProctoringResult {
  status: ProctoringStatus;
  violationCount: number;
  lastViolation: string | null;
}

export function useAiProctoring(enabled: boolean): AiProctoringResult {
  const [status, setStatus] = useState<ProctoringStatus>("disabled");
  const [violationCount, setViolationCount] = useState(0);
  const [lastViolation, setLastViolation] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const detectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noiseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastToastRef = useRef<Record<string, number>>({});
  const noiseStreakRef = useRef(0);
  const detectingRef = useRef(false);

  const warn = useCallback((key: string, message: string) => {
    const now = Date.now();
    const last = lastToastRef.current[key] || 0;
    if (now - last < TOAST_THROTTLE_MS) return;
    lastToastRef.current[key] = now;
    toast.warning(`AI Proctor: ${message}`, { autoClose: 5000 });
    setViolationCount((c) => c + 1);
    setLastViolation(message);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setStatus("initializing");

    const runDetection = async () => {
      const model = modelRef.current;
      const video = videoRef.current;
      if (!model || !video || video.readyState < 2 || detectingRef.current) {
        return;
      }
      detectingRef.current = true;
      try {
        const predictions: Array<{ class: string; score: number }> =
          await model.detect(video);
        const confident = predictions.filter((p) => p.score >= SCORE_THRESHOLD);

        const personCount = confident.filter(
          (p) => p.class === "person"
        ).length;

        if (personCount === 0) {
          warn("no-face", "No person detected in frame.");
        } else if (personCount > 1) {
          warn("multi-face", `${personCount} people detected in frame.`);
        }

        for (const p of confident) {
          if (PROHIBITED_OBJECTS[p.class]) {
            warn(`obj-${p.class}`, PROHIBITED_OBJECTS[p.class]);
          }
        }
      } catch {
        // ignore single-frame detection errors
      } finally {
        detectingRef.current = false;
      }
    };

    const sampleNoise = () => {
      const ctx = audioCtxRef.current;
      const analyser = (ctx as any)?.__analyser as AnalyserNode | undefined;
      if (!analyser) return;
      const buffer = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buffer.length);
      if (rms > NOISE_RMS_THRESHOLD) {
        noiseStreakRef.current += 1;
        if (noiseStreakRef.current >= NOISE_SUSTAIN) {
          warn("noise", "Background noise / talking detected.");
          noiseStreakRef.current = 0;
        }
      } else {
        noiseStreakRef.current = 0;
      }
    };

    const init = async () => {
      try {
        // 1. Load model libraries from CDN (wait for real globals, not just tags)
        await loadScript(TFJS_URL, () => !!window.tf);
        await loadScript(COCO_URL, () => !!window.cocoSsd);
        if (cancelled) return;

        // Ensure a TF backend is ready before loading the model
        try {
          await window.tf.ready();
        } catch {
          // tf.ready is best-effort
        }

        // 2. Acquire camera + mic
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // 3. Hidden video element to feed the model
        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.volume = 0;
        video.style.position = "fixed";
        video.style.top = "-9999px";
        video.style.width = "1px";
        video.style.height = "1px";
        document.body.appendChild(video);
        video.srcObject = stream;
        videoRef.current = video;
        await video.play().catch(() => {});

        // 4. Audio analyser for noise detection
        try {
          const AudioCtx =
            window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          (audioCtx as any).__analyser = analyser;
          audioCtxRef.current = audioCtx;
        } catch {
          // audio analysis optional
        }

        // 5. Load the COCO-SSD model
        modelRef.current = await window.cocoSsd.load({
          base: "lite_mobilenet_v2",
        });
        if (cancelled) return;

        setStatus("active");

        // 6. Start loops
        detectTimerRef.current = setInterval(runDetection, DETECT_INTERVAL_MS);
        noiseTimerRef.current = setInterval(sampleNoise, NOISE_INTERVAL_MS);
      } catch (err) {
        console.error("AI Proctoring init failed:", err);
        if (!cancelled) setStatus("error");
      }
    };

    init();

    return () => {
      cancelled = true;
      if (detectTimerRef.current) clearInterval(detectTimerRef.current);
      if (noiseTimerRef.current) clearInterval(noiseTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.remove();
        videoRef.current = null;
      }
      modelRef.current = null;
    };
  }, [enabled, warn]);

  return { status, violationCount, lastViolation };
}
