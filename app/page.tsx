"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Upload, Volume2 } from "lucide-react"
import { Orbitron } from "next/font/google"

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: [ "400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
})

export default function MusicVisualizer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioFile, setAudioFile] = useState<string>("/videoplayback.mp4")
  const [volume, setVolume] = useState([0.7])
  const [audioData, setAudioData] = useState<number[]>(new Array(128).fill(0))
  const [bassLevel, setBassLevel] = useState(0)
  const [midLevel, setMidLevel] = useState(0)
  const [trebleLevel, setTrebleLevel] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && audioRef.current) {
      const url = URL.createObjectURL(file)
      setAudioFile(url)
      audioRef.current.src = url
      setupAudioContext()
    }
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = audioFile
      setupAudioContext()
    }
  }, [])

  const setupAudioContext = () => {
    if (!audioRef.current) return

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current)

      analyserRef.current.fftSize = 256
      sourceRef.current.connect(analyserRef.current)
      analyserRef.current.connect(audioContextRef.current.destination)

      startVisualization()
    } catch (error) {
      console.error("Error setting up audio context:", error)
    }
  }

  const startVisualization = () => {
    if (!analyserRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const animate = () => {
      analyserRef.current!.getByteFrequencyData(dataArray)

      // Calculate frequency ranges
      const bass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10
      const mid = dataArray.slice(10, 50).reduce((a, b) => a + b, 0) / 40
      const treble = dataArray.slice(50, 128).reduce((a, b) => a + b, 0) / 78

      setBassLevel(bass / 255)
      setMidLevel(mid / 255)
      setTrebleLevel(treble / 255)
      setAudioData(Array.from(dataArray))

      drawVisualization(ctx, canvas, dataArray, bass, mid, treble)
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
  }

  const drawVisualization = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dataArray: Uint8Array,
    bass: number,
    mid: number,
    treble: number,
  ) => {
    const width = canvas.width
    const height = canvas.height
    const time = Date.now() * 0.001

    // Clear with fade effect for trails
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
    ctx.fillRect(0, 0, width, height)

    // Create dynamic cosmic background
    const bgGradient = ctx.createRadialGradient(
      width / 2 + Math.sin(time * 0.5) * 100,
      height / 2 + Math.cos(time * 0.3) * 80,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) / 1.5,
    )
    bgGradient.addColorStop(0, `rgba(25, 25, 112, ${0.3 + bass / 1000})`)
    bgGradient.addColorStop(0.4, `rgba(72, 61, 139, ${0.2 + mid / 1500})`)
    bgGradient.addColorStop(0.8, `rgba(15, 23, 42, ${0.1 + treble / 2000})`)
    bgGradient.addColorStop(1, "rgba(0, 0, 0, 0.9)")

    ctx.globalCompositeOperation = "screen"
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = "source-over"

    // Advanced particle system
    const particleCount = Math.floor(50 + (bass + mid + treble) / 10)
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + time * 0.5
      const radius = 100 + Math.sin(time + i * 0.1) * 50 + bass * 2
      const x = width / 2 + Math.cos(angle) * radius
      const y = height / 2 + Math.sin(angle) * radius

      const intensity = dataArray[i % dataArray.length] / 255
      const size = 1 + intensity * 4

      // Create particle with glow
      const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3)
      particleGradient.addColorStop(0, `rgba(200, 220, 255, ${intensity})`)
      particleGradient.addColorStop(0.5, `rgba(100, 150, 255, ${intensity * 0.5})`)
      particleGradient.addColorStop(1, "rgba(50, 100, 200, 0)")

      ctx.fillStyle = particleGradient
      ctx.beginPath()
      ctx.arc(x, y, size * 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // 3D-style frequency bars with perspective
    const barCount = 64
    const barWidth = width / barCount
    const perspective = height * 0.3

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * dataArray.length)
      const barHeight = (dataArray[dataIndex] / 255) * height * 0.7

      // Calculate 3D position
      const x = i * barWidth
      const z = Math.sin(time + i * 0.1) * 20 + barHeight * 0.1
      const scale = perspective / (perspective + z)

      const x3d = x * scale + (width * (1 - scale)) / 2
      const barWidth3d = barWidth * scale
      const barHeight3d = barHeight * scale

      // Create metallic gradient
      const barGradient = ctx.createLinearGradient(x3d, height, x3d, height - barHeight3d)
      const hue = 200 + (i / barCount) * 60
      const intensity = dataArray[dataIndex] / 255

      barGradient.addColorStop(0, `hsla(${hue}, 70%, 20%, 0.9)`)
      barGradient.addColorStop(0.3, `hsla(${hue}, 80%, 50%, ${0.8 + intensity * 0.2})`)
      barGradient.addColorStop(0.7, `hsla(${hue}, 90%, 70%, ${0.6 + intensity * 0.4})`)
      barGradient.addColorStop(1, `hsla(${hue}, 100%, 90%, ${0.9 + intensity * 0.1})`)

      ctx.fillStyle = barGradient
      ctx.fillRect(x3d, height - barHeight3d, barWidth3d - 1, barHeight3d)

      // Add reflection
      ctx.globalAlpha = 0.3
      const reflectionGradient = ctx.createLinearGradient(x3d, height, x3d, height + barHeight3d * 0.5)
      reflectionGradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.3)`)
      reflectionGradient.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`)
      ctx.fillStyle = reflectionGradient
      ctx.fillRect(x3d, height, barWidth3d - 1, barHeight3d * 0.5)
      ctx.globalAlpha = 1
    }

    // Advanced waveform with multiple layers
    const drawWaveform = (offset: number, color: string, lineWidth: number, alpha: number) => {
      ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.shadowColor = color
      ctx.shadowBlur = lineWidth * 2

      ctx.beginPath()
      for (let i = 0; i < dataArray.length; i++) {
        const x = (i / dataArray.length) * width
        const y =
          height / 2 + Math.sin((i / dataArray.length) * Math.PI * 4 + time * 2) * (dataArray[i] / 255) * 100 + offset

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    drawWaveform(-20, "#e2e8f0", 3, 0.8)
    drawWaveform(0, "#cbd5e1", 2, 0.6)
    drawWaveform(20, "#94a3b8", 1, 0.4)

    // Dynamic energy orbs
    const centerX = width / 2
    const centerY = height / 2

    // Bass orb
    if (bass > 30) {
      const bassRadius = 20 + (bass / 255) * 80
      const bassGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bassRadius)
      bassGradient.addColorStop(0, `rgba(59, 130, 246, ${bass / 500})`)
      bassGradient.addColorStop(0.5, `rgba(29, 78, 216, ${bass / 800})`)
      bassGradient.addColorStop(1, "rgba(29, 78, 216, 0)")

      ctx.fillStyle = bassGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, bassRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Lightning effects for high frequencies
    if (treble > 100) {
      ctx.strokeStyle = `rgba(241, 245, 249, ${treble / 255})`
      ctx.lineWidth = 2
      ctx.shadowColor = "#f1f5f9"
      ctx.shadowBlur = 10

      for (let i = 0; i < 5; i++) {
        const startAngle = (i / 5) * Math.PI * 2 + time * 3
        const endAngle = startAngle + Math.PI * 0.1
        const radius = 150 + treble * 0.5

        const startX = centerX + Math.cos(startAngle) * radius
        const startY = centerY + Math.sin(startAngle) * radius
        const endX = centerX + Math.cos(endAngle) * (radius + 50)
        const endY = centerY + Math.sin(endAngle) * (radius + 50)

        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
      }
      ctx.shadowBlur = 0
    }

    // Spiral galaxy effect
    const spiralArms = 3
    const spiralRadius = 200

    for (let arm = 0; arm < spiralArms; arm++) {
      ctx.strokeStyle = `rgba(148, 163, 184, ${0.3 + mid / 1000})`
      ctx.lineWidth = 1
      ctx.beginPath()

      for (let i = 0; i < 100; i++) {
        const t = i / 100
        const angle = arm * ((Math.PI * 2) / spiralArms) + t * Math.PI * 4 + time * 0.5
        const r = t * spiralRadius * (1 + mid / 500)
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)

        // Add stars along spiral
        if (i % 10 === 0 && dataArray[i] > 80) {
          ctx.fillStyle = `rgba(241, 245, 249, ${dataArray[i] / 255})`
          ctx.beginPath()
          ctx.arc(x, y, 1 + (dataArray[i] / 255) * 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.stroke()
    }

    // Frequency spectrum analyzer with professional styling
    const spectrumHeight = 100
    const spectrumY = height - spectrumHeight - 20

    // Background for spectrum
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)"
    ctx.fillRect(20, spectrumY, width - 40, spectrumHeight)

    // Spectrum bars
    const spectrumBarWidth = (width - 40) / dataArray.length
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * (spectrumHeight - 10)
      const x = 20 + i * spectrumBarWidth
      const y = spectrumY + spectrumHeight - barHeight - 5

      const spectrumGradient = ctx.createLinearGradient(x, y + barHeight, x, y)
      spectrumGradient.addColorStop(0, "rgba(59, 130, 246, 0.3)")
      spectrumGradient.addColorStop(0.5, "rgba(147, 197, 253, 0.6)")
      spectrumGradient.addColorStop(1, "rgba(219, 234, 254, 0.9)")

      ctx.fillStyle = spectrumGradient
      ctx.fillRect(x, y, spectrumBarWidth - 1, barHeight)
    }

    // Floating geometric shapes
    const shapeCount = 8
    for (let i = 0; i < shapeCount; i++) {
      const angle = (i / shapeCount) * Math.PI * 2 + time * 0.3
      const distance = 300 + Math.sin(time + i) * 100
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance
      const size = 10 + (dataArray[i * 16] / 255) * 20
      const rotation = time + i

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)

      // Draw diamond shape
      ctx.strokeStyle = `rgba(148, 163, 184, ${0.6 + dataArray[i * 16] / 500})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(size, 0)
      ctx.lineTo(0, size)
      ctx.lineTo(-size, 0)
      ctx.closePath()
      ctx.stroke()

      ctx.restore()
    }
  }

  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume()
      }
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value)
    if (audioRef.current) {
      audioRef.current.volume = value[0]
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-black p-4 ${orbitron.variable}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-7xl font-extralight tracking-[0.2em] bg-gradient-to-r from-slate-200 via-blue-100 to-slate-300 bg-clip-text text-transparent mb-4 font-orbitron">
            MNG music
          </h1>
          <p className="text-xl font-light tracking-wide text-gray-300 font-orbitron">
            Experience music like never before with real-time audio visualization
          </p>
        </div>

        {/* Main Visualization Canvas */}
        <Card className="mb-8 p-0 overflow-hidden bg-black/50 border-slate-600/30 shadow-2xl shadow-blue-900/20">
          <canvas ref={canvasRef} width={1200} height={600} className="w-full h-auto max-h-[600px]" />
        </Card>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* File Upload */}
          <Card className="p-6 bg-slate-900/40 border-slate-600/30 backdrop-blur-sm">
            <h3 className="text-lg font-light tracking-wider text-white mb-4 font-orbitron">UPLOAD MUSIC</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-purple-500/50 rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-purple-400 mb-2" />
                  <span className="text-sm text-gray-300 font-light font-orbitron tracking-wide">
                    {audioFile}
                  </span>
                </div>
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </Card>

          {/* Playback Controls */}
          <Card className="p-6 bg-slate-900/40 border-slate-600/30 backdrop-blur-sm">
            <h3 className="text-lg font-light tracking-wider text-white mb-4 font-orbitron">PLAYBACK</h3>
            <div className="space-y-4">
              <Button
                onClick={togglePlayPause}
                className="w-full bg-gradient-to-r from-slate-700 to-blue-700 hover:from-slate-600 hover:to-blue-600 font-orbitron font-light tracking-wider"
              >
                {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {isPlaying ? "PAUSE" : "PLAY"}
              </Button>

              <div className="flex items-center space-x-2">
                <Volume2 className="h-4 w-4 text-gray-400" />
                <Slider value={volume} onValueChange={handleVolumeChange} max={1} step={0.1} className="flex-1" />
              </div>
            </div>
          </Card>

          {/* Frequency Analysis */}
          <Card className="p-6 bg-slate-900/40 border-slate-600/30 backdrop-blur-sm">
            <h3 className="text-lg font-light tracking-wider text-white mb-4 font-orbitron">FREQUENCY ANALYSIS</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1 font-orbitron font-extralight tracking-wide">
                  <span>BASS</span>
                  <span>{Math.round(bassLevel * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-slate-600 to-blue-600 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${bassLevel * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1 font-orbitron font-extralight tracking-wide">
                  <span>MID</span>
                  <span>{Math.round(midLevel * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-slate-400 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${midLevel * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1 font-orbitron font-extralight tracking-wide">
                  <span>TREBLE</span>
                  <span>{Math.round(trebleLevel * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-slate-300 to-slate-100 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${trebleLevel * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-slate-900/40 border-slate-500/30 text-center backdrop-blur-sm">
            <div className="text-2xl font-extralight text-slate-300 mb-2 font-orbitron tracking-wider">REAL-TIME</div>
            <div className="text-sm text-slate-400 font-orbitron font-extralight tracking-wide">Audio Analysis</div>
          </Card>

          <Card className="p-4 bg-slate-900/40 border-blue-500/30 text-center backdrop-blur-sm">
            <div className="text-2xl font-extralight text-blue-300 mb-2 font-orbitron tracking-wider">256 FFT</div>
            <div className="text-sm text-slate-400 font-orbitron font-extralight tracking-wide">Frequency Bins</div>
          </Card>

          <Card className="p-4 bg-slate-900/40 border-slate-400/30 text-center backdrop-blur-sm">
            <div className="text-2xl font-extralight text-slate-200 mb-2 font-orbitron tracking-wider">60 FPS</div>
            <div className="text-sm text-slate-400 font-orbitron font-extralight tracking-wide">Smooth Animation</div>
          </Card>

          <Card className="p-4 bg-slate-900/40 border-blue-400/30 text-center backdrop-blur-sm">
            <div className="text-2xl font-extralight text-blue-200 mb-2 font-orbitron tracking-wider">MULTI-LAYER</div>
            <div className="text-sm text-slate-400 font-orbitron font-extralight tracking-wide">Visualization</div>
          </Card>
        </div>

        <audio ref={audioRef} crossOrigin="anonymous" />
      </div>
    </div>
  )
}
