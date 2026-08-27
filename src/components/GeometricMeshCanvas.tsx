import React, { useEffect, useRef } from 'react';

interface GeometricMeshCanvasProps {
  /** Optional theme variation */
  variant?: 'dark' | 'light';
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  rotSpeed: number;
  color: string;
}

export const GeometricMeshCanvas: React.FC<GeometricMeshCanvasProps> = ({
  variant = 'dark',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 170,
      active: false
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
      }
    };

    const handleTouchEnd = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.active = false;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', handleResize);

    // Color palettes based on theme
    const colors = variant === 'dark'
      ? ['#0284c7', '#0ea5e9', '#38bdf8', '#60a5fa', '#3b82f6']
      : ['#0284c7', '#0369a1', '#0ea5e9', '#2563eb', '#38bdf8'];

    const numParticles = Math.min(Math.floor((width * height) / 16000), 75);
    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          size: 3.5 + Math.random() * 4.5,
          angle: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.02,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    initParticles();

    // Helper to draw an equilateral/isoceles triangle
    const drawTriangle = (x: number, y: number, size: number, angle: number, color: string, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.866, size * 0.5);
      ctx.lineTo(-size * 0.866, size * 0.5);
      ctx.closePath();

      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Subtle translucent fill
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.25;
      ctx.fill();

      ctx.restore();
    };

    const maxLineDist = 135;
    const maxTriDist = 105;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.rotSpeed;

        // Bounce on borders
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse gentle repel / interaction
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius && dist > 0) {
            const force = (mouse.radius - dist) / mouse.radius;
            p.x -= (dx / dist) * force * 1.8;
            p.y -= (dy / dist) * force * 1.8;
          }
        }
      }

      // Draw connecting mesh triangles (3 nearby vertices)
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const d12 = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (d12 < maxTriDist) {
            for (let k = j + 1; k < particles.length; k++) {
              const p3 = particles[k];
              const d13 = Math.hypot(p1.x - p3.x, p1.y - p3.y);
              const d23 = Math.hypot(p2.x - p3.x, p2.y - p3.y);

              if (d13 < maxTriDist && d23 < maxTriDist) {
                // Calculate average distance to mouse to light up triangles
                let mouseGlow = 0;
                if (mouse.active) {
                  const midX = (p1.x + p2.x + p3.x) / 3;
                  const midY = (p1.y + p2.y + p3.y) / 3;
                  const mDist = Math.hypot(mouse.x - midX, mouse.y - midY);
                  if (mDist < mouse.radius) {
                    mouseGlow = (1 - mDist / mouse.radius) * 0.35;
                  }
                }

                const avgDist = (d12 + d13 + d23) / 3;
                const baseAlpha = (1 - avgDist / maxTriDist) * 0.08 + mouseGlow;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();

                ctx.fillStyle = variant === 'dark' ? 'rgba(56, 189, 248, 1)' : 'rgba(14, 165, 233, 1)';
                ctx.globalAlpha = Math.min(baseAlpha, 0.45);
                ctx.fill();
              }
            }
          }
        }
      }

      // Draw connecting lines between particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < maxLineDist) {
            let lineAlpha = (1 - dist / maxLineDist) * (variant === 'dark' ? 0.22 : 0.18);

            // Brighten if near mouse
            if (mouse.active) {
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const mDist = Math.hypot(mouse.x - midX, mouse.y - midY);
              if (mDist < mouse.radius) {
                lineAlpha += (1 - mDist / mouse.radius) * 0.35;
              }
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = variant === 'dark' ? '#38bdf8' : '#0284c7';
            ctx.globalAlpha = Math.min(lineAlpha, 0.7);
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw connections to mouse cursor
        if (mouse.active) {
          const mDist = Math.hypot(p1.x - mouse.x, p1.y - mouse.y);
          if (mDist < mouse.radius) {
            const alpha = (1 - mDist / mouse.radius) * 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = '#38bdf8';
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Draw a subtle connecting triangle towards mouse with closest neighbor
            for (let j = i + 1; j < particles.length; j++) {
              const p2 = particles[j];
              const d12 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
              const mDist2 = Math.hypot(p2.x - mouse.x, p2.y - mouse.y);

              if (d12 < maxTriDist && mDist2 < mouse.radius) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.closePath();
                ctx.fillStyle = 'rgba(56, 189, 248, 1)';
                ctx.globalAlpha = alpha * 0.25;
                ctx.fill();
              }
            }
          }
        }

        // Draw the particle triangle
        let particleAlpha = variant === 'dark' ? 0.6 : 0.5;
        if (mouse.active) {
          const mDist = Math.hypot(p1.x - mouse.x, p1.y - mouse.y);
          if (mDist < mouse.radius) {
            particleAlpha = 0.95;
          }
        }

        drawTriangle(p1.x, p1.y, p1.size, p1.angle, p1.color, particleAlpha);
      }

      // Draw cursor ambient glow point
      if (mouse.active) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.globalAlpha = 0.8;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.globalAlpha = 0.5;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 z-0 h-full w-full ${className}`}
    />
  );
};
