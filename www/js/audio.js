/**
 * Audio Service - Handles all game sounds using Web Audio API
 */

export class AudioService {
  constructor() {
    this.ctx = null;
    this.scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  }

  /**
   * Initialize the audio context
   */
  init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    } catch (e) {
      console.warn('Failed to initialize audio:', e);
    }
  }

  /**
   * Resume audio context if suspended
   */
  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Play a musical note based on step in scale
   * @param {number} step - Step in the musical scale
   * @param {boolean} isPerfect - Whether this is a perfect placement
   * @param {boolean} isMuted - Whether audio is muted
   */
  playNote(step, isPerfect, isMuted) {
    if (!this.ctx || isMuted) return;
    
    try {
      this._resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = isPerfect ? 'sine' : 'triangle';
      const freq = this.scale[step % 8] * Math.pow(2, Math.floor(step / 8));
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Failed to play note:', e);
    }
  }

  /**
   * Play a specific frequency tone
   * @param {number} frequency - Frequency in Hz
   * @param {boolean} isMuted - Whether audio is muted
   */
  playTone(frequency, isMuted) {
    if (!this.ctx || isMuted) return;
    
    try {
      this._resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Failed to play tone:', e);
    }
  }

  /**
   * Play block placement sound
   * @param {boolean} isMuted - Whether audio is muted
   */
  playPlace(isMuted) {
    if (!this.ctx || isMuted) return;
    
    try {
      this._resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Failed to play place sound:', e);
    }
  }

  /**
   * Play crash/miss sound
   * @param {boolean} isMuted - Whether audio is muted
   */
  playCrash(isMuted) {
    if (!this.ctx || isMuted) return;
    
    try {
      this._resume();
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      
      // Apply lowpass filter with frequency sweep
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      noise.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Failed to play crash sound:', e);
    }
  }

  /**
   * Play game over sound
   * @param {boolean} isMuted - Whether audio is muted
   */
  playGameOver(isMuted) {
    if (!this.ctx || isMuted) return;
    
    try {
      this._resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.8);
      
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Failed to play game over sound:', e);
    }
  }
}

// Create singleton instance
export const audioService = new AudioService();
