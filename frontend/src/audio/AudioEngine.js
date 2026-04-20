function createReverb(ctx, duration = 2.5, decay = 2.0) {
  const length = ctx.sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  return conv;
}

export class AudioEngine {
  constructor() {
    this._ctx = null;
    this._sources = [];
    this._endTimer = null;
    this.isPlaying = false;
  }

  play(params, onEnded) {
    this.stop();

    const ctx = new AudioContext();
    this._ctx = ctx;

    // Master output
    const master = ctx.createGain();
    master.gain.value = 0.75;
    master.connect(ctx.destination);

    // Analyser for visualizer
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(master);

    // Dry / wet split for reverb
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 1 - params.reverb_amount;
    wet.gain.value = params.reverb_amount;
    dry.connect(analyser);
    wet.connect(createReverb(ctx));
    ctx.createConvolver && wet.connect(analyser); // reverb also feeds analyser

    const reverb = createReverb(ctx);
    const wetNode = ctx.createGain();
    wetNode.gain.value = params.reverb_amount;
    reverb.connect(analyser);

    const dryNode = ctx.createGain();
    dryNode.gain.value = Math.max(0, 1 - params.reverb_amount);
    dryNode.connect(analyser);

    const now = ctx.currentTime + 0.05;

    params.voices.forEach((voice) => {
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = voice.gain;
      voiceGain.connect(dryNode);
      voiceGain.connect(reverb);

      voice.notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = voice.waveform;
        osc.frequency.value = note.frequency_hz;

        const start = now + note.delay_s;
        const end = start + note.duration_s;
        const attack = Math.min(0.02, note.duration_s * 0.1);
        const release = Math.min(0.08, note.duration_s * 0.2);
        const peak = note.gain ?? 1.0;

        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(peak, start + attack);
        env.gain.setValueAtTime(peak, end - release);
        env.gain.linearRampToValueAtTime(0, end);

        osc.connect(env);
        env.connect(voiceGain);
        osc.start(start);
        osc.stop(end);

        this._sources.push(osc);
      });
    });

    this.isPlaying = true;
    this._endTimer = setTimeout(() => {
      this.isPlaying = false;
      onEnded?.();
    }, (params.total_duration_s + 0.8) * 1000);

    return analyser;
  }

  stop() {
    if (this._endTimer) {
      clearTimeout(this._endTimer);
      this._endTimer = null;
    }
    this._sources.forEach((s) => {
      try { s.stop(); } catch (_) {}
    });
    this._sources = [];
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
    this.isPlaying = false;
  }
}
