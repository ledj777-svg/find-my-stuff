import { useEffect, useRef, useState } from 'react'
import { Search, Bookmark, Zap, Eye, MapPin, Check, Camera } from 'lucide-react'

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
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [liveMode, setLiveMode] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Ready')
  const [results, setResults] = useState<any[]>([])
  const [remembering, setRemembering] = useState(false)
  const [finding, setFinding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [boxes, setBoxes] = useState<DetectedBox[]>([])
  const [hasRemembered, setHasRemembered] = useState(false)

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
          setStatus('Camera ready')
        }
      } catch (err) {
        setStatus('Camera permission denied')
        console.error(err)
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
      const t = setTimeout(() => setToast(null), 2800)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Capture frame
  const captureFrame = (): Promise<Blob | null> => {
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
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      } else {
        resolve(null)
      }
    })
  }

  // Fake bounding boxes for demo
  const generateFakeBoxes = (labels: string[]): DetectedBox[] => {
    return labels.slice(0, 4).map((label, i) => ({
      label,
      x: 12 + (i % 2) * 48,
      y: 18 + Math.floor(i / 2) * 38,
      w: 36,
      h: 28
    }))
  }

  // Remember
  const handleRemember = async () => {
    setRemembering(true)
    setStatus('Analysing scene...')
    setBoxes([])
    const blob = await captureFrame()
    if (!blob) {
      setStatus('Failed to capture')
      setRemembering(false)
      return
    }

    const formData = new FormData()
    formData.append('file', blob, 'frame.jpg')
    formData.append('location', 'Current view')

    try {
      const res = await fetch('/api/remember', { method: 'POST', body: formData })
      const data = await res.json()
      const objects = data.objects || []
      setBoxes(generateFakeBoxes(objects))
      setHasRemembered(true)
      setToast(`Remembered ${objects.length} objects`)
      setStatus('Camera ready')
    } catch (err) {
      setStatus('Remember failed')
    }
    setRemembering(false)
  }

  // Find
  const handleFind = async () => {
    if (!query.trim()) return
    setFinding(true)
    setStatus(`Searching for "${query}"...`)
    setResults([])
    setBoxes([])

    const blob = await captureFrame()
    const formData = new FormData()
    formData.append('query', query)
    if (blob) formData.append('file', blob, 'frame.jpg')

    try {
      const res = await fetch('/api/find', { method: 'POST', body: formData })
      const data = await res.json()
      const matches = data.matches || []
      setResults(matches)
      if (matches.length > 0) {
        setBoxes(generateFakeBoxes(matches.map((m: any) => m.object)))
        setStatus(`Found ${matches.length} match(es)`)
      } else {
        setStatus('No matches found')
      }
    } catch (err) {
      setStatus('Find failed')
    }
    setFinding(false)
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
            <p className="text-[11px] text-gray-400 mt-0.5">Visual memory for your world</p>
          </div>
        </div>

        <div className="flex bg-gray-900/80 rounded-full p-1 border border-gray-800">
          <button
            onClick={() => setLiveMode(false)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              !liveMode ? 'bg-sky-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Smart
          </button>
          <button
            onClick={() => setLiveMode(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              liveMode ? 'bg-sky-500 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Live
          </button>
        </div>
      </header>

      {/* Camera */}
      <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Bounding boxes overlay */}
        {boxes.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {boxes.map((box, i) => (
              <div
                key={i}
                className="absolute border-2 border-sky-400 rounded-md"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                }}
              >
                <span className="absolute -top-6 left-0 bg-sky-500 text-white text-[11px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap">
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

        {liveMode && (
          <div className="absolute top-4 right-4 bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            LIVE
          </div>
        )}

        {/* Empty state hint */}
        {!hasRemembered && boxes.length === 0 && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md text-sm text-gray-200 px-4 py-2 rounded-full border border-white/10">
              Point at a place and tap <span className="text-sky-400 font-medium">Remember</span>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
            <Check className="w-4 h-4" />
            {toast}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-3 max-h-40 overflow-y-auto space-y-2">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-xl px-3.5 py-2.5">
              <div>
                <p className="font-medium text-[15px]">{r.object}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.location} · last seen just now</p>
              </div>
              <span className="text-sky-400 text-sm font-semibold">{Math.round(r.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4 space-y-3">
        <div className="flex gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFind()}
            placeholder="Where is my blue charger?"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 transition"
          />
          <button
            onClick={handleFind}
            disabled={finding || !query.trim()}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 px-5 rounded-2xl flex items-center justify-center transition active:scale-95"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Primary CTA - gradient */}
        <button
          onClick={handleRemember}
          disabled={remembering}
          className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition shadow-lg shadow-sky-600/20 active:scale-[0.98]"
        >
          <Camera className="w-4 h-4" />
          {remembering ? 'Analysing...' : 'Remember this place'}
        </button>
      </div>
    </div>
  )
}

export default App
