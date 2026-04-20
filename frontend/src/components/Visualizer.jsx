import { useEffect, useRef } from 'react';

export default function Visualizer({ analyser }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);

      const { width: w, height: h } = canvas;
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, w, h);

      const barW = (w / bufLen) * 2.5;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const barH = (data[i] / 255) * h;
        const hue = (i / bufLen) * 200 + 160; // teal → purple
        ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
        ctx.fillRect(x, h - barH, barW, barH);
        x += barW + 1;
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return <canvas ref={canvasRef} className="visualizer" width={600} height={120} />;
}
