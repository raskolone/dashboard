import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/AppContext';

export function ParticleBackground({ forceDark }: { forceDark?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useAppStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    // Determine colors based on theme
    const isLight = theme === 'light' && !forceDark;
    const particleColor = isLight ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.15)';
    const connectionBaseColor = isLight ? 'rgba(0, 0, 0' : 'rgba(255, 255, 255';
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 1.5 + 0.5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas!.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas!.height) this.vy = -this.vy;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      }
    }

    const initParticles = () => {
      const area = canvas.width * canvas.height;
      const count = Math.min(Math.floor(area / 20000), 50); // Reduced particle count
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `${connectionBaseColor}, ${isLight ? 0.2 - dist/800 : 0.15 - dist / 800})`;
            ctx.stroke();
          }
        }

        // Connect to mouse
        const dxMouse = particles[i].x - mouseX;
        const dyMouse = particles[i].y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouseX, mouseY);
          // 43, 102, 234 - blueish for Day or keep neon green #4ade80 (117, 211, 110)
          const mouseConnectionColor = isLight ? '0, 100, 200' : '117, 211, 110';
          ctx.strokeStyle = `rgba(${mouseConnectionColor}, ${0.4 - distMouse / 400})`; 
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, forceDark]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[-1]"
    />
  );
}
