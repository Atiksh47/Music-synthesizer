import { useEffect, useRef, useMemo, useCallback } from 'react';
import { VOICE_COLORS } from '../data/constants';

// ── Constants ──────────────────────────────────────────────────────
const KEYBOARD_W  = 46;   // left gutter width (piano keys)
const NOTE_H      = 9;    // height of each semitone row (px)
const PAD_TOP     = 14;   // space above the grid
const PAD_BOTTOM  = 22;   // space below the grid (time axis labels)
const BLACK_KEYS  = new Set([1, 3, 6, 8, 10]); // C# D# F# G# A#
const NOTE_NAMES  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiLabel(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function roundRect(ctx, x, y, w, h, r) {
  const cr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + cr, y);
  ctx.lineTo(x + w - cr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + cr);
  ctx.lineTo(x + w, y + h - cr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - cr, y + h);
  ctx.lineTo(x + cr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - cr);
  ctx.lineTo(x, y + cr);
  ctx.quadraticCurveTo(x, y, x + cr, y);
  ctx.closePath();
}

// ── Component ──────────────────────────────────────────────────────
export default function PianoRoll({ voices, totalDuration, playStartTime, dark }) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  // Compute the MIDI range covered by all notes (+2 semitone padding each side)
  const range = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    voices?.forEach(v =>
      v.notes?.forEach(n => {
        const m = freqToMidi(n.frequency_hz);
        if (m < lo) lo = m;
        if (m > hi) hi = m;
      })
    );
    if (!isFinite(lo)) return { lo: 55, hi: 85 };
    return { lo: Math.floor(lo) - 2, hi: Math.ceil(hi) + 2 };
  }, [voices]);

  const draw = useCallback((playheadSecs = null) => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap || !voices?.length) return;

    const W       = wrap.clientWidth;
    const rows    = range.hi - range.lo + 1;
    const H       = rows * NOTE_H + PAD_TOP + PAD_BOTTOM;
    const rollW   = W - KEYBOARD_W;
    const rollH   = rows * NOTE_H;

    // Only reset canvas dimensions when they actually change (resetting clears the canvas)
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext('2d');

    // Palette
    const P = dark ? {
      bg:        '#0d0d0f',
      rowWhite:  '#111117',
      rowBlack:  '#0a0a0e',
      rowBorder: '#1a1a26',
      beatLine:  '#1e1e2e',
      keyWhite:  '#23232f',
      keyBlack:  '#141418',
      keyBorder: '#0a0a0e',
      keyLabel:  '#4b5068',
      timeLabel: '#3d3f55',
      playhead:  '#f87171',
    } : {
      bg:        '#f8f7ff',
      rowWhite:  '#ffffff',
      rowBlack:  '#eeeef8',
      rowBorder: '#e4e4f0',
      beatLine:  '#d8d8ec',
      keyWhite:  '#f0eff8',
      keyBlack:  '#d1d5db',
      keyBorder: '#e5e7eb',
      keyLabel:  '#9ca3af',
      timeLabel: '#c4c4d8',
      playhead:  '#ef4444',
    };

    // ── Background ─────────────────────────────────────────────────
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);

    // ── Grid rows ──────────────────────────────────────────────────
    for (let m = range.lo; m <= range.hi; m++) {
      const row = range.hi - m;
      const y   = PAD_TOP + row * NOTE_H;
      ctx.fillStyle = BLACK_KEYS.has(m % 12) ? P.rowBlack : P.rowWhite;
      ctx.fillRect(KEYBOARD_W, y, rollW, NOTE_H);
      // subtle row border
      ctx.fillStyle = P.rowBorder;
      ctx.fillRect(KEYBOARD_W, y + NOTE_H - 1, rollW, 1);
    }

    // ── Vertical beat lines + time labels ─────────────────────────
    const stepSecs = totalDuration <= 5 ? 0.5 : totalDuration <= 15 ? 1 : 2;
    for (let t = 0; t <= totalDuration + stepSecs / 2; t += stepSecs) {
      const x = KEYBOARD_W + (t / totalDuration) * rollW;
      ctx.fillStyle = P.beatLine;
      ctx.fillRect(x, PAD_TOP, 1, rollH);
      ctx.fillStyle = P.timeLabel;
      ctx.font = '9px Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${t % 1 === 0 ? t : t.toFixed(1)}s`, x + 2, PAD_TOP + rollH + 14);
    }

    // ── Piano keyboard gutter ──────────────────────────────────────
    // Divider line between keyboard and roll
    ctx.fillStyle = dark ? '#2a2a3a' : '#cbd5e1';
    ctx.fillRect(KEYBOARD_W - 1, PAD_TOP, 1, rollH);

    for (let m = range.lo; m <= range.hi; m++) {
      const row   = range.hi - m;
      const y     = PAD_TOP + row * NOTE_H;
      const black = BLACK_KEYS.has(m % 12);

      // Key face
      ctx.fillStyle = black ? P.keyBlack : P.keyWhite;
      ctx.fillRect(1, y + 1, KEYBOARD_W - 3, NOTE_H - 2);

      // Key bottom border
      ctx.fillStyle = P.keyBorder;
      ctx.fillRect(1, y + NOTE_H - 1, KEYBOARD_W - 3, 1);

      // Label every C note
      if (m % 12 === 0) {
        ctx.fillStyle = P.keyLabel;
        ctx.font = '8px Consolas, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(midiLabel(m), 3, y + NOTE_H - 2);
      }
    }

    // ── Notes ──────────────────────────────────────────────────────
    voices.forEach((voice, vi) => {
      const color = VOICE_COLORS[vi % VOICE_COLORS.length];
      voice.notes?.forEach(note => {
        const midi = Math.round(freqToMidi(note.frequency_hz));
        if (midi < range.lo || midi > range.hi) return;

        const row   = range.hi - midi;
        const x     = KEYBOARD_W + (note.delay_s / totalDuration) * rollW;
        const noteW = Math.max(2, (note.duration_s / totalDuration) * rollW - 1);
        const y     = PAD_TOP + row * NOTE_H + 1;
        const h     = NOTE_H - 2;
        const alpha = 0.35 + (note.gain ?? 1.0) * 0.65;

        ctx.globalAlpha = alpha;
        ctx.fillStyle   = color;
        roundRect(ctx, x, y, noteW, h, 2);
        ctx.fill();

        // Subtle border to separate adjacent notes at same pitch
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = dark ? '#000' : '#fff';
        ctx.lineWidth   = 0.5;
        roundRect(ctx, x + 0.5, y + 0.5, noteW - 1, h - 1, 2);
        ctx.stroke();
      });
    });
    ctx.globalAlpha = 1.0;

    // ── Playhead ───────────────────────────────────────────────────
    if (playheadSecs !== null && playheadSecs >= 0) {
      const x = KEYBOARD_W + Math.min(1, playheadSecs / totalDuration) * rollW;

      // Glow
      ctx.shadowColor = P.playhead;
      ctx.shadowBlur  = 6;
      ctx.fillStyle   = P.playhead;
      ctx.fillRect(x - 1, PAD_TOP, 2, rollH);
      ctx.shadowBlur  = 0;

      // Triangle cap
      ctx.beginPath();
      ctx.moveTo(x - 5, PAD_TOP);
      ctx.lineTo(x + 5, PAD_TOP);
      ctx.lineTo(x, PAD_TOP + 7);
      ctx.closePath();
      ctx.fill();
    }
  }, [voices, totalDuration, range, dark]);

  // Static redraw whenever data or theme changes; also on container resize
  useEffect(() => {
    draw(null);
    const obs = new ResizeObserver(() => draw(null));
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [draw]);

  // Playhead animation — runs only while playing
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (playStartTime === null) {
      draw(null);
      return;
    }

    const tick = () => {
      const elapsed = (Date.now() - playStartTime) / 1000;
      draw(elapsed);
      if (elapsed < totalDuration) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        draw(null); // clear playhead when done
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playStartTime, draw, totalDuration]);

  return (
    <div ref={wrapRef} className="piano-roll-wrap">
      <div className="piano-roll-header">
        <span className="piano-roll-title">Piano Roll</span>
        <span className="piano-roll-meta">
          {voices?.length ?? 0} voice{voices?.length !== 1 ? 's' : ''} ·{' '}
          {totalDuration?.toFixed(1)}s
        </span>
      </div>
      <canvas ref={canvasRef} className="piano-roll-canvas" />
    </div>
  );
}
