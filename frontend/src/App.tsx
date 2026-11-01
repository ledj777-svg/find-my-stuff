import { useEffect, useRef, useState } from 'react'
import { MapPin, Check, Mic, Camera, X } from 'lucide-react'

interface MemoryItem {
  id: string
  imageUrl: string
  objects: string[]
  timestamp: number
  placeName: string
}

interface DetectedBox {
  label: string
  x: number
  y: number
  w: number
  h: number
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [liveMode, setLiveMode] = useState(false)
  const [status, setStatus] = useState('Ready')
  const [toast, setToast] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [boxes, setBoxes] = useState<DetectedBox[]>([])
  const [memory, setMemory] = useState<MemoryItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [reply, setReply] = useState<string | null>(null)

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        })
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          setStream(mediaStream)
          setStatus('Ready')
        }
      } catch (err) {
        setStatus('Camera permission denied')
      }
    }
    startCamera()
    return () => {
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Auto-hide reply
  useEffect(() => {
    if (reply) {
      const t = setTimeout(() => setReply(null), 5000)
      return () => clearTimeout(t)
    }
  }, [reply])

  // Capture current frame
  const captureFrame = (): Promise<{ blob: Blob; url: string } | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        resolve(null)
        return
      }
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            resolve({ blob, url })
          } else resolve(null)
        }, 'image/jpeg', 0.85)
      } else resolve(null)
    })
  }

  // Start voice recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setToast('Voice not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setTranscript('')
      setStatus('Listening...')
    }

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      handleVoiceQuery(text)
    }

    recognition.onerror = () => {
      setListening(false)
      setStatus(liveMode ? 'Live Mode' : 'Ready')
    }

    recognition.onend = () => {
      setListening(false)
      setStatus(liveMode ? 'Live Mode' : 'Ready')
    }

    recognition.start()
  }

  // Handle voice query
  const handleVoiceQuery = async (text: string) => {
    setIsProcessing(true)
    setStatus('Searching...')
    setBoxes([])
    setReply(null)

    // Simple mock logic for now
    const lower = text.toLowerCase()
    const isFindQuery = lower.includes('where') || lower.includes('find') || lower.includes('key') || lower.includes('charger') || lower.includes('notebook')

    if (isFindQuery) {
      // Fake detection
      await new Promise(r => setTimeout(r, 900))

      const fakeBox = {
        label: lower.includes('key') ? 'car keys' : lower.includes('charger') ? 'blue charger' : 'object',
        x: 30,
        y: 35,
        w: 28,
        h: 22
      }
      setBoxes([fakeBox])

      if (memory.length > 0) {
        setReply(`I can see the ${fakeBox.label} nearby. You also saved it earlier.`)
      } else {
        setReply(`I can see the ${fakeBox.label} right here.`)
      }
      setStatus('Found')
    } else {
      setReply("I heard you. Try saying: Where is my car key?")
      setStatus(liveMode ? 'Live Mode' : 'Ready')
    }

    setIsProcessing(false)
  }

  // Short press = Capture + save + start voice
  const handleShortPress = async () => {
    setIsProcessing(true)
    setStatus('Saving...')
    setBoxes([])

    const captured = await captureFrame()
    if (!captured) {
      setStatus('Capture failed')
      setIsProcessing(false)
      return
    }

    // Save to memory (mock objects for now)
    const newItem: MemoryItem = {
      id: Date.now().toString(),
      imageUrl: captured.url,
      objects: ['blue charger', 'keys', 'notebook'],
      timestamp: Date.now(),
      placeName: 'Current place'
    }
    setMemory(prev => [newItem, ...prev])

    setToast('Saved on your device')
    setStatus('Ready')
    setIsProcessing(false)

    // Auto start voice
    setTimeout(() => startListening(), 400)
  }

  // Long press = Live Mode + voice
  const handleLongPress = () => {
    setLiveMode(true)
    setStatus('Live Mode')
    setToast('Live Mode on')
    setTimeout(() => startListening(), 300)
  }

  // Button press handlers
  const onPressStart = () => {
    isLongPress.current = false
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true
      handleLongPress()
    }, 1500)
  }

  const onPressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    if (!isLongPress.current) {
      handleShortPress()
    }
  }

  const exitLiveMode = () => {
    setLiveMode(false)
    setStatus('Ready')
    setBoxes([])
    setListening(false)
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-none">Find My Stuff</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {memory.length > 0 ? `${memory.length} place${memory.length > 1 ? 's' : ''} in memory` : 'Visual memory for your world'}
            </p>
          </div>
        </div>

        {liveMode && (
          <button
            onClick={exitLiveMode}
            className="flex items-center gap-1.5 bg-sky-600 text-white text-xs font-medium px-3 py-1.5 rounded-full"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Live
            <X className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
      </header>

      {/* Camera View */}
      <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Bounding boxes */}
        {boxes.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {boxes.map((box, i) => (
              <div
                key={i}
                className="absolute border-2 border-sky-400 rounded-lg"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                }}
              >
                <span className="absolute -top-7 left-0 bg-sky-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow">
                  {box.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Status */}
        <div className="absolute top-4 left-4">
          <div className="bg-black/55 backdrop-blur-md text-sm px-3.5 py-1.5 rounded-full border border-white/10">
            {status}
          </div>
        </div>

        {/* Listening indicator */}
        {listening && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            <Mic className="w-3.5 h-3.5 animate-pulse" />
            Listening
          </div>
        )}

        {/* Voice reply bubble */}
        {reply && (
          <div className="absolute bottom-28 left-4 right-4 flex justify-center">
            <div className="bg-black/70 backdrop-blur-md text-sm text-white px-5 py-3 rounded-2xl border border-white/10 max-w-sm text-center">
              {reply}
            </div>
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="absolute bottom-20 left-4 right-4 flex justify-center">
            <div className="bg-sky-600/80 text-white text-xs px-3 py-1.5 rounded-full">
              “{transcript}”
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
            <Check className="w-4 h-4" />
            {toast}
          </div>
        </div>
      )}

      {/* Bottom - One main button */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-6 flex flex-col items-center gap-3">
        <p className="text-xs text-gray-400">
          {liveMode
            ? 'Live Mode • Speak to find objects'
            : 'Tap to save • Hold 1.5s for Live Mode'}
        </p>

        <button
          onMouseDown={onPressStart}
          onMouseUp={onPressEnd}
          onMouseLeave={onPressEnd}
          onTouchStart={onPressStart}
          onTouchEnd={onPressEnd}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition active:scale-95 shadow-xl ${
            liveMode
              ? 'bg-sky-500 shadow-sky-500/40'
              : 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-600/30'
          } ${isProcessing ? 'opacity-60' : ''}`}
        >
          {listening ? (
            <Mic className="w-8 h-8 text-white animate-pulse" />
          ) : (
            <Camera className="w-8 h-8 text-white" />
          )}
        </button>

        {listening && (
          <p className="text-xs text-sky-400">Say “Where is my car key?”</p>
        )}
      </div>
    </div>
  )
}

export default App
