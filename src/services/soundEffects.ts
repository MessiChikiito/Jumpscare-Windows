/**
 * Web Audio API synthesizer for realistic horror & animatronic jumpscare sound effects
 * (Inspired by FNAF Foxy sprint, metal hallway footsteps, and distorted animatronic scream).
 */

class SoundEffectsService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Generates Foxy's fast metal footsteps running down the West Hallway
   */
  public playRunningFootsteps(volume = 1, speed = 1.0): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        const steps = 7;
        const stepInterval = 0.16 / Math.max(0.4, speed);

        for (let i = 0; i < steps; i++) {
          const stepTime = now + i * stepInterval;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          // Pitch scales with speed for terrifying demonic low vs frantic high pitch
          const baseFreq = (90 + i * 20) * Math.sqrt(speed);
          osc.frequency.setValueAtTime(baseFreq, stepTime);
          osc.frequency.exponentialRampToValueAtTime(35 * speed, stepTime + 0.08 / speed);

          // Volume increases rapidly
          const stepVol = Math.min(1, (0.2 + (i / steps) * 0.8) * volume);
          gain.gain.setValueAtTime(stepVol, stepTime);
          gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.09 / speed);

          // Add metallic thud filter
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime((600 + i * 150) * Math.sqrt(speed), stepTime);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(stepTime);
          osc.stop(stepTime + 0.1 / speed);
        }

        setTimeout(resolve, (steps * stepInterval + 0.2) * 1000);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Generates a loud, multi-oscillator distorted animatronic scream
   */
  public playFoxyScream(volume = 1, duration = 2.4, speed = 1.0): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const effectiveDuration = duration / Math.max(0.3, speed);
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.min(1.5, volume * 1.2), now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + effectiveDuration);
      masterGain.connect(ctx.destination);

      // 1. High screaming dissonance (FNAF style metallic squeal)
      const frequencies = [780, 840, 920, 1140, 1420, 2100].map((f) => f * Math.pow(speed, 0.7));
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(freq, now);
        // Wild vibrato
        osc.frequency.linearRampToValueAtTime(freq * 1.15, now + 0.1 / speed);
        osc.frequency.linearRampToValueAtTime(freq * 0.85, now + 0.35 / speed);
        osc.frequency.linearRampToValueAtTime(freq * 1.05, now + 0.8 / speed);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + effectiveDuration);

        gain.gain.setValueAtTime(0.35 / frequencies.length, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + effectiveDuration);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + effectiveDuration);
      });

      // 2. White noise burst (broken speaker / static scream)
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 1.5));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1500, now);
      noiseFilter.Q.setValueAtTime(1.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7 * volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);

      // 3. Sub bass punch (jump scare impact)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
      subGain.gain.setValueAtTime(0.9 * volume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      subOsc.connect(subGain);
      subGain.connect(masterGain);
      subOsc.start(now);
      subOsc.stop(now + 0.5);
    } catch {
      // AudioContext policy handled gracefully
    }
  }

  /**
   * UI Click feedback
   */
  public playClick(): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Ignored
    }
  }
}

export const soundEffects = new SoundEffectsService();
