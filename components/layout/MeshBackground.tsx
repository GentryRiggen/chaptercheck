"use client";

import { useTheme } from "next-themes";
import { useCallback,useEffect, useRef, useState } from "react";

import { getMeshTheme } from "@/lib/theme";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function MeshBackground() {
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
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

  // Mouse-reactive gradient position
  const gradientX = 30 + mousePos.x * 40;
  const gradientY = 30 + mousePos.y * 40;

  return (
    <div ref={containerRef} className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ background: baseGradient }}
      />

      {/* Mouse-following gradient spotlight */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
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

      {/* Animated mesh grid */}
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="grid-pattern"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${mousePos.x * 10 - 5}, ${mousePos.y * 10 - 5})`}
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

      {/* Floating orbs that react to mouse */}
      {orbs.map((orb, i) => {
        const offsetX = (mousePos.x - 0.5) * 30 * orb.speed;
        const offsetY = (mousePos.y - 0.5) * 30 * orb.speed;
        const color = i % 2 === 0 ? primary : secondary;
        return (
          <div
            key={i}
            className="absolute animate-float rounded-full transition-transform duration-700 ease-out"
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
