"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

import { getMeshTheme } from "@/lib/theme";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function MeshBackground() {
  const [mounted, setMounted] = useState(false);
  const [smoothMousePos, setSmoothMousePos] = useState({ x: 0.5, y: 0.5 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetMousePos = useRef({ x: 0.5, y: 0.5 });
  const animationFrameRef = useRef<number | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mouse tracking with smooth interpolation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetMousePos.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    // Lerp factor - lower = slower/more delayed (0.02 = very subtle, 0.1 = responsive)
    const lerpFactor = 0.03;

    const animate = () => {
      setSmoothMousePos((prev) => {
        const dx = targetMousePos.current.x - prev.x;
        const dy = targetMousePos.current.y - prev.y;

        // Only update if there's meaningful difference
        if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
          return prev;
        }

        return {
          x: prev.x + dx * lerpFactor,
          y: prev.y + dy * lerpFactor,
        };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Keystroke ripples
  const addRipple = useCallback((x: number, y: number) => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 1000);
  }, []);

  useEffect(() => {
    const handleKeyDown = () => {
      const x = 30 + Math.random() * 40;
      const y = 30 + Math.random() * 40;
      addRipple(x, y);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addRipple]);

  // Click ripples
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      addRipple(x, y);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [addRipple]);

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const theme = getMeshTheme(isDark);
  const { primary, secondary, baseGradient, opacity, orbs } = theme;

  // Mouse-reactive gradient position (reduced range: 40-60% instead of 30-70%)
  const gradientX = 40 + smoothMousePos.x * 20;
  const gradientY = 40 + smoothMousePos.y * 20;

  return (
    <div ref={containerRef} className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ background: baseGradient }}
      />

      {/* Mouse-following gradient spotlight */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${gradientX}% ${gradientY}%, rgba(${primary.rgbString}, ${opacity.spotlight}) 0%, transparent 40%)`,
        }}
      />

      {/* Secondary ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${100 - gradientX}% ${100 - gradientY}%, rgba(${secondary.rgbString}, ${opacity.ambientGlow}) 0%, transparent 50%)`,
        }}
      />

      {/* Animated mesh grid (reduced movement: 3px instead of 10px) */}
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="grid-pattern"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${smoothMousePos.x * 3 - 1.5}, ${smoothMousePos.y * 3 - 1.5})`}
          >
            <circle cx="25" cy="25" r="1" fill={`rgba(${primary.rgbString}, ${opacity.gridDot})`} />
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke={`rgba(${primary.rgbString}, ${opacity.gridLine})`}
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="grid-fade" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="grid-mask">
            <rect width="100%" height="100%" fill="url(#grid-fade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" mask="url(#grid-mask)" />
      </svg>

      {/* Floating orbs that react to mouse (reduced movement: 15px instead of 30px) */}
      {orbs.map((orb, i) => {
        const offsetX = (smoothMousePos.x - 0.5) * 15 * orb.speed;
        const offsetY = (smoothMousePos.y - 0.5) * 15 * orb.speed;
        const color = i % 2 === 0 ? primary : secondary;
        return (
          <div
            key={i}
            className="absolute animate-float rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: `calc(${orb.baseX}% + ${offsetX}px)`,
              top: `calc(${orb.baseY}% + ${offsetY}px)`,
              background: `radial-gradient(circle, rgba(${color.rgbString}, ${orb.opacity}) 0%, transparent 70%)`,
              transform: "translate(-50%, -50%)",
              animationDelay: `${i * -5}s`,
              animationDuration: `${20 + i * 3}s`,
            }}
          />
        );
      })}

      {/* Keystroke/click ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="pointer-events-none absolute animate-ripple"
          style={{
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: 200,
              height: 200,
              border: `1px solid rgba(${primary.rgbString}, ${opacity.rippleBorder})`,
              boxShadow: `0 0 15px rgba(${primary.rgbString}, ${opacity.rippleGlow})`,
            }}
          />
        </div>
      ))}

      {/* Corner accent glows */}
      <div
        className="absolute left-0 top-0 h-96 w-96"
        style={{
          opacity: opacity.cornerGlow,
          background: `radial-gradient(circle at 0% 0%, rgba(${primary.rgbString}, ${opacity.cornerGlowInner}) 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute bottom-0 right-0 h-96 w-96"
        style={{
          opacity: opacity.cornerGlow,
          background: `radial-gradient(circle at 100% 100%, rgba(${secondary.rgbString}, ${opacity.cornerGlowInner}) 0%, transparent 60%)`,
        }}
      />
    </div>
  );
}
