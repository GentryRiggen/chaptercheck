"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { getMeshTheme } from "@/lib/theme";

export function MeshBackground() {
  const [mounted, setMounted] = useState(false);
  const [smoothMousePos, setSmoothMousePos] = useState({ x: 0.5, y: 0.5 });
  const targetMousePos = useRef({ x: 0.5, y: 0.5 });
  const animationFrameRef = useRef<number | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Gentle mouse tracking with smooth interpolation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetMousePos.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    const lerpFactor = 0.02;

    const animate = () => {
      setSmoothMousePos((prev) => {
        const dx = targetMousePos.current.x - prev.x;
        const dy = targetMousePos.current.y - prev.y;

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

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const theme = getMeshTheme(isDark);
  const { primary, secondary, baseGradient, opacity, orbs } = theme;

  const gradientX = 40 + smoothMousePos.x * 20;
  const gradientY = 40 + smoothMousePos.y * 20;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ background: baseGradient }}
      />

      {/* Gentle mouse-following spotlight */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${gradientX}% ${gradientY}%, rgba(${primary.rgbString}, ${opacity.spotlight}) 0%, transparent 50%)`,
        }}
      />

      {/* Secondary ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${100 - gradientX}% ${100 - gradientY}%, rgba(${secondary.rgbString}, ${opacity.ambientGlow}) 0%, transparent 60%)`,
        }}
      />

      {/* Soft floating orbs */}
      {orbs.map((orb, i) => {
        const offsetX = (smoothMousePos.x - 0.5) * 10 * orb.speed;
        const offsetY = (smoothMousePos.y - 0.5) * 10 * orb.speed;
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
              animationDelay: `${i * -7}s`,
              animationDuration: `${25 + i * 5}s`,
            }}
          />
        );
      })}

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
