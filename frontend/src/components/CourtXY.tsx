"use client";
import React, { useCallback } from "react";

export type XY = { x: number; y: number } | null;

export default function CourtXY({
  value,
  onChange,
  size = 240,
  label,
}: {
  value: XY;
  onChange: (xy: { x: number; y: number }) => void;
  size?: number;
  label?: string;
}) {
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    onChange({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
  }, [onChange]);

  return (
    <div style={{ display: "inline-block" }}>
      {label && <div style={{ marginBottom: 6, fontSize: 12, opacity: 0.8 }}>{label}</div>}
      <div
        onClick={handleClick}
        style={{
          position: "relative",
          width: size,
          height: size,
          border: "1px solid #bbb",
          background: "#fafafa",
          cursor: "crosshair",
          userSelect: "none",
        }}
        title="Clique para marcar"
      >
        {/* linhas de grade simples (3x3) */}
        <div style={{ position: "absolute", left: "33.333%", top: 0, bottom: 0, width: 1, background: "#e0e0e0" }} />
        <div style={{ position: "absolute", left: "66.666%", top: 0, bottom: 0, width: 1, background: "#e0e0e0" }} />
        <div style={{ position: "absolute", top: "33.333%", left: 0, right: 0, height: 1, background: "#e0e0e0" }} />
        <div style={{ position: "absolute", top: "66.666%", left: 0, right: 0, height: 1, background: "#e0e0e0" }} />

        {/* marcador */}
        {value && (
          <div
            style={{
              position: "absolute",
              left: `calc(${value.x * 100}% - 6px)`,
              top: `calc(${value.y * 100}% - 6px)`,
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#222",
              border: "2px solid white",
              boxShadow: "0 0 0 1px #222",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      {value && (
        <div style={{ marginTop: 4, fontSize: 12, color: "#555" }}>
          x={value.x.toFixed(3)}, y={value.y.toFixed(3)}{" "}
          <button
            type="button"
            onClick={() => onChange({ x: 0.5, y: 0.5 })}
            style={{ marginLeft: 8, fontSize: 12 }}
          >
            centralizar
          </button>
        </div>
      )}
    </div>
  );
}
