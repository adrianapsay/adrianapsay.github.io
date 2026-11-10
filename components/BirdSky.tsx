"use client";

import { useEffect, useRef } from "react";
import { startSky } from "@/lib/sky";

export function BirdSky({ src, alt }: { src: string; alt: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current, photo = photoRef.current;
    if (!stage || !canvas || !photo) return;
    return startSky(stage, canvas, photo);
  }, []);

  return (
    <div className="stage" ref={stageRef}>
      <canvas className="back" ref={canvasRef} aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={photoRef} src={src} alt={alt} width={640} height={853} />
      <span className="hint">click the sky to toss some seeds</span>
    </div>
  );
}
