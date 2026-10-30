"use client"

import createGlobe, { type COBEOptions } from "cobe"
import { useCallback, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

// Globo recolorido para a marca FarmaFlux. Marcador grande em Brasília/DF (onde
// está a UBS do desafio) e cidades de referência internacional, entre elas
// Londres (modelo MyGP, Reino Unido, citado na proposta).
const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.28,
  dark: 0.1,
  diffuse: 0.6,
  mapSamples: 24000,
  mapBrightness: 4.5,
  mapBaseBrightness: 0.12,
  baseColor: [0.88, 0.97, 0.88], // pontos em menta clara (leem no fundo verde)
  markerColor: [0.90, 0.98, 0.62], // accent FarmaFlux
  glowColor: [0.38, 0.62, 0.54], // halo teal
  markers: [
    { location: [-15.7939, -47.8828], size: 0.1 }, // Brasília / DF
    { location: [-23.5505, -46.6333], size: 0.055 }, // São Paulo
    { location: [-22.9068, -43.1729], size: 0.05 }, // Rio de Janeiro
    { location: [51.5072, -0.1276], size: 0.07 }, // Londres (MyGP)
    { location: [40.7128, -74.006], size: 0.045 }, // Nova York
    { location: [35.6762, 139.6503], size: 0.04 }, // Tóquio
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: COBEOptions
}) {
  const phiRef = useRef(0)
  const widthRef = useRef(0)
  const rRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
    }
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      rRef.current = delta / 200
    }
  }

  const onRender = useCallback((state: Record<string, number>) => {
    // Gira sozinho, a menos que o usuário esteja arrastando ou peça menos movimento.
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!pointerInteracting.current && !reduceMotion) phiRef.current += 0.005
    state.phi = phiRef.current + rRef.current
    state.width = widthRef.current * 2
    state.height = widthRef.current * 2
  }, [])

  const onResize = useCallback(() => {
    if (canvasRef.current) {
      widthRef.current = canvasRef.current.offsetWidth
    }
  }, [])

  useEffect(() => {
    window.addEventListener("resize", onResize)
    onResize()

    // cobe v2 aceita onRender em runtime, mas o deixou fora do tipo COBEOptions.
    const options = {
      ...config,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      onRender,
    }
    const globe = createGlobe(canvasRef.current!, options)

    const reveal = window.setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = "1"
    })
    return () => {
      globe.destroy()
      window.clearTimeout(reveal)
      window.removeEventListener("resize", onResize)
    }
  }, [config, onRender, onResize])

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
        className,
      )}
    >
      <canvas
        className="size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        ref={canvasRef}
        onPointerDown={(e) =>
          updatePointerInteraction(
            e.clientX - pointerInteractionMovement.current,
          )
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  )
}
