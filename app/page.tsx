"use client"

import type React from "react"

import { useState, useRef, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Upload, Volume2, Maximize2, Settings, Globe, Zap, Sparkles, Orbit } from "lucide-react"
import { Space_Grotesk as SpaceGrotesk } from "next/font/google"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Stars, Environment, Box, Torus, Plane, PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"

const spaceGrotesk = SpaceGrotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

// 3D Audio Visualizer Components
function AudioSphere({ audioData, bassLevel, midLevel, trebleLevel }: any) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((state) => {
    if (meshRef.current && materialRef.current) {
      meshRef.current.rotation.x += 0.01 + bassLevel * 0.02
      meshRef.current.rotation.y += 0.005 + midLevel * 0.01

      // Update shader uniforms
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
      materialRef.current.uniforms.bassLevel.value = bassLevel
      materialRef.current.uniforms.midLevel.value = midLevel
      materialRef.current.uniforms.trebleLevel.value = trebleLevel
    }
  })

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform float bassLevel;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      vec3 newPosition = position;
      float noise = sin(position.x * 10.0 + time) * sin(position.y * 10.0 + time) * sin(position.z * 10.0 + time);
      newPosition += normal * noise * 0.1 * (1.0 + bassLevel * 2.0);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `

  const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform float bassLevel;
    uniform float midLevel;
    uniform float trebleLevel;
    
    void main() {
      vec3 color1 = vec3(0.3, 0.6, 1.0); // Blue
      vec3 color2 = vec3(0.6, 0.3, 1.0); // Purple
      vec3 color3 = vec3(0.0, 1.0, 1.0); // Cyan
      
      float mixer = sin(vPosition.x * 5.0 + time) * 0.5 + 0.5;
      vec3 finalColor = mix(color1, color2, mixer * bassLevel);
      finalColor = mix(finalColor, color3, trebleLevel);
      
      float alpha = 0.7 + midLevel * 0.3;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `

  return (
    <mesh ref={meshRef} scale={[2, 2, 2]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          time: { value: 0 },
          bassLevel: { value: 0 },
          midLevel: { value: 0 },
          trebleLevel: { value: 0 },
        }}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function FrequencyBars({ audioData }: any) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01
    }
  })

  return (
    <group ref={groupRef}>
      {audioData.slice(0, 64).map((value: number, index: number) => {
        const height = (value / 255) * 5 + 0.1
        const angle = (index / 64) * Math.PI * 2
        const radius = 4
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius

        return (
          <Box key={index} position={[x, height / 2, z]} scale={[0.1, height, 0.1]} rotation={[0, angle, 0]}>
            <meshStandardMaterial
              color={new THREE.Color().setHSL((index / 64) * 0.5 + 0.5, 1, 0.5)}
              emissive={new THREE.Color().setHSL((index / 64) * 0.5 + 0.5, 1, 0.2)}
            />
          </Box>
        )
      })}
    </group>
  )
}

function ParticleField({ bassLevel, midLevel, trebleLevel }: any) {
  const pointsRef = useRef<THREE.Points>(null)
  const particleCount = 1000

  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30

    colors[i * 3] = Math.random()
    colors[i * 3 + 1] = Math.random()
    colors[i * 3 + 2] = Math.random()
  }

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x += 0.001 + bassLevel * 0.01
      pointsRef.current.rotation.y += 0.002 + midLevel * 0.01

      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        positions[i3 + 1] += Math.sin(state.clock.elapsedTime + i * 0.01) * 0.01 * (1 + trebleLevel)
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={particleCount} />
        <bufferAttribute args={[colors, 3]} attach="attributes-color" count={particleCount} />
      </bufferGeometry>
      <pointsMaterial size={0.2} vertexColors transparent opacity={0.8} />
    </points>
  )
}

function FloatingPlatforms({ universe }: { universe: string }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5
    }
  })

  const platformConfigs = {
    cosmic: [
      { pos: [5, 2, 0], color: "#4dabf7", size: [2, 0.2, 2] },
      { pos: [-5, -1, 3], color: "#845ef7", size: [1.5, 0.2, 1.5] },
      { pos: [0, 3, -5], color: "#22d3ee", size: [2.5, 0.2, 2.5] },
    ],
    neon: [
      { pos: [4, 1, 2], color: "#ff0080", size: [1.8, 0.3, 1.8] },
      { pos: [-3, -2, -1], color: "#00ff80", size: [2.2, 0.3, 2.2] },
      { pos: [1, 4, -4], color: "#8000ff", size: [1.6, 0.3, 1.6] },
    ],
    quantum: [
      { pos: [6, 0, 1], color: "#ffd700", size: [2, 0.1, 2] },
      { pos: [-4, 2, -2], color: "#ff6b35", size: [1.8, 0.1, 1.8] },
      { pos: [2, -3, 4], color: "#7209b7", size: [2.4, 0.1, 2.4] },
    ],
    matrix: [
      { pos: [3, 1, 1], color: "#00ff00", size: [1.5, 0.2, 1.5] },
      { pos: [-2, -1, -3], color: "#00aa00", size: [2, 0.2, 2] },
      { pos: [0, 2, -2], color: "#00cc00", size: [1.8, 0.2, 1.8] },
    ],
  }

  const platforms = platformConfigs[universe as keyof typeof platformConfigs] || platformConfigs.cosmic

  return (
    <group ref={groupRef}>
      {platforms.map((platform, index) => (
        <Box
          key={index}
          position={platform.pos as [number, number, number]}
          scale={platform.size as [number, number, number]}
        >
          <meshStandardMaterial
            color={platform.color}
            emissive={platform.color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </Box>
      ))}
    </group>
  )
}

function WaveformRings({ audioData, bassLevel }: any) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += 0.01
    }
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: 5 }, (_, i) => (
        <Torus key={i} position={[0, 0, 0]} args={[3 + i * 1.5, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, i * 0.2]}>
          <meshStandardMaterial
            color={new THREE.Color().setHSL(i * 0.1 + 0.5, 1, 0.5)}
            emissive={new THREE.Color().setHSL(i * 0.1 + 0.5, 1, 0.2)}
            emissiveIntensity={0.2 + bassLevel * 0.5}
            transparent
            opacity={0.6}
          />
        </Torus>
      ))}
    </group>
  )
}

function UniverseEnvironment({ universe, audioData, bassLevel, midLevel, trebleLevel }: any) {
  const { scene } = useThree()

  useEffect(() => {
    const fogConfigs = {
      cosmic: { color: "#0a1128", near: 10, far: 50 },
      neon: { color: "#1a0a2e", near: 8, far: 40 },
      quantum: { color: "#2d1b69", near: 12, far: 60 },
      matrix: { color: "#001100", near: 5, far: 35 },
    }

    const config = fogConfigs[universe as keyof typeof fogConfigs] || fogConfigs.cosmic
    scene.fog = new THREE.Fog(config.color, config.near, config.far)
  }, [universe, scene])

  return (
    <>
      {universe === "cosmic" && (
        <>
          <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          <Environment preset="night" />
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#4dabf7" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#845ef7" />
          <directionalLight position={[0, 10, 0]} intensity={0.5} color="#22d3ee" />
        </>
      )}

      {universe === "neon" && (
        <>
          <ambientLight intensity={0.1} />
          <pointLight position={[0, 10, 0]} intensity={2} color="#ff0080" />
          <pointLight position={[10, 0, 10]} intensity={1.5} color="#00ff80" />
          <pointLight position={[-10, 0, -10]} intensity={1.5} color="#8000ff" />
          <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
            <meshStandardMaterial color="#1a0a2e" />
          </Plane>
          {/* Neon grid lines */}
          {Array.from({ length: 10 }, (_, i) => (
            <Box key={i} position={[i * 4 - 20, -4.9, 0]} scale={[0.1, 0.1, 40]}>
              <meshStandardMaterial color="#ff0080" emissive="#ff0080" emissiveIntensity={0.5} />
            </Box>
          ))}
        </>
      )}

      {universe === "quantum" && (
        <>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={1} color="#ffd700" />
          <pointLight position={[0, 0, 0]} intensity={2} color="#ff6b35" />
          <WaveformRings audioData={audioData} bassLevel={bassLevel} />
        </>
      )}

      {universe === "matrix" && (
        <>
          <ambientLight intensity={0.1} />
          <pointLight position={[0, 10, 0]} intensity={1} color="#00ff00" />
          <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
            <meshStandardMaterial color="#001100" />
          </Plane>
          {/* Matrix code blocks */}
          {Array.from({ length: 20 }, (_, i) => (
            <Box
              key={i}
              position={[(Math.random() - 0.5) * 30, Math.random() * 10, (Math.random() - 0.5) * 30]}
              scale={[0.2, 0.2, 0.2]}
            >
              <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
            </Box>
          ))}
        </>
      )}

      <AudioSphere audioData={audioData} bassLevel={bassLevel} midLevel={midLevel} trebleLevel={trebleLevel} />
      <FrequencyBars audioData={audioData} />
      <ParticleField bassLevel={bassLevel} midLevel={midLevel} trebleLevel={trebleLevel} />
      <FloatingPlatforms universe={universe} />
    </>
  )
}

function Scene3D({ universe, audioData, bassLevel, midLevel, trebleLevel }: any) {
  return (
    <Canvas className="w-full h-full" gl={{ antialias: true, alpha: false }}>
      <PerspectiveCamera makeDefault position={[0, 5, 15]} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} autoRotate autoRotateSpeed={0.5} />

      <Suspense fallback={null}>
        <UniverseEnvironment
          universe={universe}
          audioData={audioData}
          bassLevel={bassLevel}
          midLevel={midLevel}
          trebleLevel={trebleLevel}
        />
      </Suspense>
    </Canvas>
  )
}

export default function MetaverseMusicVisualizer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioFile, setAudioFile] = useState("/videoplayback.mp4")
  const [volume, setVolume] = useState([0.7])
  const [audioData, setAudioData] = useState<number[]>(new Array(256).fill(0))
  const [bassLevel, setBassLevel] = useState(0)
  const [midLevel, setMidLevel] = useState(0)
  const [trebleLevel, setTrebleLevel] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [activeUniverse, setActiveUniverse] = useState<"cosmic" | "neon" | "quantum" | "matrix">("cosmic")
  const [isMobile, setIsMobile] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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
      setAudioFile(file)
      const url = URL.createObjectURL(file)
      audioRef.current.src = url
      setupAudioContext()
    }
  }

  const setupAudioContext = () => {
    if (!audioRef.current) return

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current)

      analyserRef.current.fftSize = 1024
      sourceRef.current.connect(analyserRef.current)
      analyserRef.current.connect(audioContextRef.current.destination)

      startVisualization()
    } catch (error) {
      console.error("Error setting up audio context:", error)
    }
  }

  const startVisualization = () => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const animate = () => {
      analyserRef.current!.getByteFrequencyData(dataArray)

      const bass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10
      const mid = dataArray.slice(10, 100).reduce((a, b) => a + b, 0) / 90
      const treble = dataArray.slice(100, 256).reduce((a, b) => a + b, 0) / 156

      setBassLevel(bass / 255)
      setMidLevel(mid / 255)
      setTrebleLevel(treble / 255)
      setAudioData(Array.from(dataArray))

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
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

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const universeConfigs = {
    cosmic: {
      name: "Cosmic Nebula",
      icon: Globe,
      description: "Deep space with nebulae and stars",
      gradient: "from-blue-600 to-purple-600",
    },
    neon: {
      name: "Neon City",
      icon: Zap,
      description: "Cyberpunk cityscape with neon lights",
      gradient: "from-pink-600 to-cyan-600",
    },
    quantum: {
      name: "Quantum Realm",
      icon: Orbit,
      description: "Subatomic particle visualization",
      gradient: "from-yellow-600 to-orange-600",
    },
    matrix: {
      name: "Digital Matrix",
      icon: Sparkles,
      description: "Binary code rain environment",
      gradient: "from-green-600 to-emerald-600",
    },
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-screen bg-gradient-to-br from-[#050714] via-[#0a1128] to-[#050714] text-white",
        spaceGrotesk.variable,
        isFullscreen && "fixed inset-0 z-50",
      )}
    >
      <div className="max-w-7xl mx-auto px-2 py-4 md:p-6 h-full flex flex-col">
        {/* Header */}
        {(!isFullscreen || showControls) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-4 md:mb-8"
          >
            <h1 className="text-4xl md:text-6xl font-light tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2 md:mb-4 font-space-grotesk">
              METAVERSE VISUALIZER
            </h1>
            <p className="text-sm md:text-lg font-light tracking-wide text-blue-200/80 font-space-grotesk">
              Experience music across infinite dimensions
            </p>
          </motion.div>
        )}

        {/* Main 3D Visualization */}
        <div className="relative flex-grow flex flex-col">
          <div
            className="relative w-full flex-grow bg-[#050714]/80 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(77,171,247,0.15)] border border-blue-900/30"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isFullscreen && setShowControls(false)}
          >
            <Scene3D
              universe={activeUniverse}
              audioData={audioData}
              bassLevel={bassLevel}
              midLevel={midLevel}
              trebleLevel={trebleLevel}
            />

            {/* Overlay controls */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={togglePlayPause}
                        disabled={!audioFile}
                        size="sm"
                        variant="ghost"
                        className="bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 p-0"
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </Button>

                      {!isMobile && (
                        <div className="flex items-center gap-2 w-32">
                          <Volume2 className="h-4 w-4 text-blue-300" />
                          <Slider
                            value={volume}
                            onValueChange={handleVolumeChange}
                            max={1}
                            step={0.01}
                            className="flex-1"
                          />
                        </div>
                      )}

                      {audioFile && (
                        <span className="text-xs md:text-sm text-blue-200 font-light truncate max-w-[150px] md:max-w-xs">
                          {audioFile.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={toggleFullscreen}
                        size="sm"
                        variant="ghost"
                        className="bg-white/10 hover:bg-white/20 text-white rounded-full w-8 h-8 p-0"
                      >
                        <Maximize2 size={16} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Universe selector overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {Object.entries(universeConfigs).map(([key, config]) => {
                const IconComponent = config.icon
                return (
                  <Button
                    key={key}
                    onClick={() => setActiveUniverse(key as any)}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "w-10 h-10 p-0 rounded-full transition-all",
                      activeUniverse === key
                        ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                        : "bg-white/10 hover:bg-white/20 text-white/70",
                    )}
                    title={config.name}
                  >
                    <IconComponent size={18} />
                  </Button>
                )
              })}
            </div>

            {/* Current universe info */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-lg p-3 border border-blue-900/50">
              <div className="text-blue-300 font-medium text-sm">{universeConfigs[activeUniverse].name}</div>
              <div className="text-gray-400 text-xs">{universeConfigs[activeUniverse].description}</div>
            </div>
          </div>

          {/* Controls Panel */}
          {(!isFullscreen || showControls) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-6"
            >
              {/* File Upload */}
              <div className="bg-[#0a1128]/80 backdrop-blur-sm rounded-lg border border-blue-900/30 p-4 md:p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base md:text-lg font-light text-blue-300 font-space-grotesk">AUDIO</h3>
                  <Upload className="h-4 w-4 text-blue-400" />
                </div>
                <label className="flex items-center justify-center w-full h-16 border border-dashed border-blue-500/50 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-blue-900/10">
                  <span className="text-xs text-blue-200 font-light font-space-grotesk text-center px-2">
                    {audioFile ? audioFile.name : "Choose audio file"}
                  </span>
                  <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Universe Selection */}
              <div className="bg-[#0a1128]/80 backdrop-blur-sm rounded-lg border border-blue-900/30 p-4 md:p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base md:text-lg font-light text-blue-300 font-space-grotesk">UNIVERSE</h3>
                  <Globe className="h-4 w-4 text-blue-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(universeConfigs).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setActiveUniverse(key as any)}
                      className={cn(
                        "p-2 rounded-md text-xs font-light transition-colors",
                        activeUniverse === key
                          ? `bg-gradient-to-r ${config.gradient} text-white`
                          : "bg-blue-900/20 text-blue-300/70 hover:bg-blue-900/30",
                      )}
                    >
                      {config.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="bg-[#0a1128]/80 backdrop-blur-sm rounded-lg border border-blue-900/30 p-4 md:p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base md:text-lg font-light text-blue-300 font-space-grotesk">PLAYBACK</h3>
                  <Volume2 className="h-4 w-4 text-blue-400" />
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={togglePlayPause}
                    disabled={!audioFile}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-light text-sm"
                  >
                    {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isPlaying ? "PAUSE" : "PLAY"}
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Volume2 className="h-3 w-3 text-blue-400" />
                    <Slider value={volume} onValueChange={handleVolumeChange} max={1} step={0.01} className="flex-1" />
                  </div>
                </div>
              </div>

              {/* Frequency Analysis */}
              <div className="bg-[#0a1128]/80 backdrop-blur-sm rounded-lg border border-blue-900/30 p-4 md:p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base md:text-lg font-light text-blue-300 font-space-grotesk">FREQUENCY</h3>
                  <Settings className="h-4 w-4 text-blue-400" />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1 font-light">
                      <span>BASS</span>
                      <span>{Math.round(bassLevel * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-900/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${bassLevel * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1 font-light">
                      <span>MID</span>
                      <span>{Math.round(midLevel * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-900/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${midLevel * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1 font-light">
                      <span>TREBLE</span>
                      <span>{Math.round(trebleLevel * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-900/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${trebleLevel * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <audio ref={audioRef} crossOrigin="anonymous" />
      </div>
    </div>
  )
}
