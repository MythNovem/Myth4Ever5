class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(type) {
        if (!this.enabled || !this.ctx) return;

        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        switch (type) {
            case 'draw':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, time);
                osc.frequency.exponentialRampToValueAtTime(800, time + 0.1);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
                gain.gain.linearRampToValueAtTime(0, time + 0.15);
                osc.start(time);
                osc.stop(time + 0.15);
                break;
                
            case 'play':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, time);
                osc.frequency.exponentialRampToValueAtTime(300, time + 0.1);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.4, time + 0.02);
                gain.gain.linearRampToValueAtTime(0, time + 0.15);
                osc.start(time);
                osc.stop(time + 0.15);
                break;

            case 'defuse':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, time);
                osc.frequency.setValueAtTime(800, time + 0.1);
                osc.frequency.setValueAtTime(1200, time + 0.2);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
                gain.gain.linearRampToValueAtTime(0.3, time + 0.3);
                gain.gain.linearRampToValueAtTime(0, time + 0.5);
                osc.start(time);
                osc.stop(time + 0.5);
                break;
                
            case 'error':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, time);
                osc.frequency.setValueAtTime(120, time + 0.1);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
                gain.gain.linearRampToValueAtTime(0, time + 0.2);
                osc.start(time);
                osc.stop(time + 0.2);
                break;

            case 'explosion':
                // Soft lowpass thud generator for explosion
                const bufferSize = this.ctx.sampleRate * 0.3;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                
                const noiseFilter = this.ctx.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.setValueAtTime(350, time);
                noiseFilter.frequency.exponentialRampToValueAtTime(60, time + 0.3);

                noise.connect(noiseFilter);
                noiseFilter.connect(gain);
                
                gain.gain.setValueAtTime(0.15, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
                
                noise.start(time);
                noise.stop(time + 0.3);
                break;
            case 'nitro':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, time);
                osc.frequency.exponentialRampToValueAtTime(1200, time + 0.4);
                gain.gain.setValueAtTime(0.3, time);
                gain.gain.linearRampToValueAtTime(0, time + 0.4);
                osc.start(time);
                osc.stop(time + 0.4);
                break;

            case 'item':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, time); // C5
                osc.frequency.setValueAtTime(659.25, time + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, time + 0.16); // G5
                osc.frequency.setValueAtTime(1046.50, time + 0.24); // C6
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
                gain.gain.linearRampToValueAtTime(0, time + 0.35);
                osc.start(time);
                osc.stop(time + 0.35);
                break;

            case 'spin':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, time);
                osc.frequency.linearRampToValueAtTime(200, time + 0.3);
                gain.gain.setValueAtTime(0.3, time);
                gain.gain.linearRampToValueAtTime(0, time + 0.3);
                osc.start(time);
                osc.stop(time + 0.3);
                break;

            case 'rocket':
                osc.type = 'square';
                osc.frequency.setValueAtTime(200, time);
                osc.frequency.exponentialRampToValueAtTime(800, time + 0.3);
                gain.gain.setValueAtTime(0.4, time);
                gain.gain.linearRampToValueAtTime(0, time + 0.3);
                osc.start(time);
                osc.stop(time + 0.3);
                break;

            case 'lap':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, time);
                osc.frequency.setValueAtTime(900, time + 0.12);
                osc.frequency.setValueAtTime(1200, time + 0.24);
                gain.gain.setValueAtTime(0.4, time);
                gain.gain.linearRampToValueAtTime(0, time + 0.4);
                osc.start(time);
                osc.stop(time + 0.4);
                break;
        }
    }
}

window.soundFX = new SoundFX();
