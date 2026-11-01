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
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    if (reply) {
      const t = setTimeout(() => setReply(null), 4500)
      return () => clearTimeout(t)
    }
  }, [reply])

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

  const handleVoiceQuery = async (text: string) => {
    setIsProcessing(true)
    setStatus('Thinking...')
    setBoxes([])
    setReply(null)

    const lower = text.toLowerCase()

    const isFindQuery =
      lower.includes('where') ||
      lower.includes('find') ||
      lower.includes('left') ||
      lower.includes('keep') ||
      lower.includes('put') ||
      lower.includes('key') ||
      lower.includes('charger') ||
      lower.includes('notebook') ||
      lower.includes('wallet') ||
      lower.includes('phone')

    await new Promise(r => setTimeout(r, 800))

    if (isFindQuery) {
      let label = 'object'
      if (lower.includes('key')) label = 'car keys'
      else if (lower.includes('charger')) label = 'blue charger'
      else if (lower.includes('notebook')) label = 'black notebook'
      else if (lower.includes('wallet')) label = 'wallet'
      else if (lower.includes('phone')) label = 'phone'

      setBoxes([{ label, x: 28, y: 32, w: 30, h: 24 }])

      if (memory.length > 0) {
        setReply(`I can see the ${label} nearby. You also saved a place earlier.`)
      } else {
        setReply(`I can see the ${label} right here.`)
      }
      setStatus('Found')
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      setReply("Hey! Just say something like ‘Where is my car key?’")
      setStatus(liveMode ? 'Live Mode' : 'Ready')
    } else if (lower.includes('thank')) {
      setReply("You’re welcome!")
      setStatus(liveMode ? 'Live Mode' : 'Ready')
    } else {
      setReply("I’m here to help you find things. Try asking ‘Where did I leave my keys?’")
      setStatus(liveMode ? 'Live Mode' : 'Ready')
    }

    setIsProcessing(false)
  }

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

    setTimeout(() => startListening(), 400)
  }

  const handleLongPress = () => {
    setLiveMode(true)
    setStatus('Live Mode')
    setToast('Live Mode on')
    setTimeout(() => startListening(), 300)
  }

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
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Find My Stuff</h1>
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

      {/* Camera area - takes almost all space */}
      <div className="relative flex-1 min-h-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Boxes */}
        {boxes.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-10">
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
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-black/60 backdrop-blur-md text-sm px-3.5 py-1.5 rounded-full border border-white/10">
            {status}
          </div>
        </div>

        {/* Listening */}
        {listening && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-red-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            <Mic className="w-3.5 h-3.5 animate-pulse" />
            Listening
          </div>
        )}

        {/* Reply */}
        {reply && (
          <div className="absolute bottom-28 left-4 right-4 flex justify-center z-20">
            <div className="bg-black/75 backdrop-blur-md text-sm text-white px-5 py-3 rounded-2xl border border-white/10 max-w-sm text-center">
              {reply}
            </div>
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="absolute bottom-20 left-4 right-4 flex justify-center z-20">
            <div className="bg-sky-600/80 text-white text-xs px-3 py-1.5 rounded-full">
              “{transcript}”
            </div>
          </div>
        )}

        {/* Floating button - minimal, over the camera */}
        <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-1.5 z-30">
          <p className="text-[11px] text-white/70 bg-black/50 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
            {liveMode ? 'Live Mode • Just speak' : 'Tap to save • Hold for Live Mode'}
          </p>

          <button
            onMouseDown={onPressStart}
            onMouseUp={onPressEnd}
            onMouseLeave={onPressEnd}
            onTouchStart={onPressStart}
            onTouchEnd={onPressEnd}
            disabled={isProcessing}
            className={`rounded-full flex items-center justify-center transition active:scale-95 shadow-2xl ${
              liveMode
                ? 'bg-sky-500 shadow-sky-500/50'
                : 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-600/40'
            } ${isProcessing ? 'opacity-60' : ''}`}
            style={{ width: '68px', height: '68px' }}
          >
            {listening ? (
              <Mic className="w-6 h-6 text-white animate-pulse" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
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
    </div>
  )
}

export default App
