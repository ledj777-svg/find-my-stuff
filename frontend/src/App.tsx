import { useEffect, useRef, useState } from 'react'
import { Search, Zap, Eye, MapPin, Check, Camera, RotateCcw, Save } from 'lucide-react'

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
  const [finding, setFinding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // New Remember flow states
  const [isSnapshot, setIsSnapshot] = useState(false)
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [boxes, setBoxes] = useState<DetectedBox[]>([])
  const [showReview, setShowReview] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

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

  // Capture frame as blob + object URL
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
          } else {
            resolve(null)
          }
        }, 'image/jpeg', 0.85)
      } else {
        resolve(null)
      }
    })
  }

  // Fake boxes for demo
  const generateFakeBoxes = (labels: string[]): DetectedBox[] => {
    const positions = [
      { x: 10, y: 15, w: 32, h: 26 },
      { x: 55, y: 18, w: 30, h: 24 },
      { x: 12, y: 55, w: 28, h: 22 },
      { x: 58, y: 52, w: 30, h: 25 },
    ]
    return labels.slice(0, 4).map((label, i) => ({
      label,
      ...positions[i]
    }))
  }

  // ========== NEW REMEMBER FLOW ==========
  const handleRemember = async () => {
    // 1. Freeze frame
    const captured = await captureFrame()
    if (!captured) {
      setStatus('Failed to capture')
      return
    }

    setSnapshotUrl(captured.url)
    setIsSnapshot(true)
    setIsAnalyzing(true)
    setBoxes([])
    setShowReview(false)
    setStatus('Analyzing...')

    // 2. Call backend (mock)
    const formData = new FormData()
    formData.append('file', captured.blob, 'frame.jpg')
    formData.append('location', 'Current view')

    try {
      const res = await fetch('/api/remember', { method: 'POST', body: formData })
      const data = await res.json()
      const objects = data.objects || ['blue charger', 'black notebook', 'keys', 'silver pen']

      // 3. Simulate scanning delay then show boxes one by one
      await new Promise(r => setTimeout(r, 1200))

      setIsAnalyzing(false)
      setShowReview(true)

      // Pop boxes in one by one
      const fakeBoxes = generateFakeBoxes(objects)
      for (let i = 0; i < fakeBoxes.length; i++) {
        await new Promise(r => setTimeout(r, 280))
        setBoxes(prev => [...prev, fakeBoxes[i]])
      }

      setStatus(`${objects.length} objects found`)
    } catch (err) {
      setIsAnalyzing(false)
      setStatus('Analysis failed')
    }
  }

  // Save the snapshot to memory
  const handleSave = () => {
    setSavedCount(prev => prev + 1)
    setToast('Saved on your device')
    // Reset to live camera
    if (snapshotUrl) URL.revokeObjectURL(snapshotUrl)
    setSnapshotUrl(null)
    setIsSnapshot(false)
    setBoxes([])
    setShowReview(false)
    setStatus('Camera ready')
  }

  // Retake
  const handleRetake = () => {
    if (snapshotUrl) URL.revokeObjectURL(snapshotUrl)
    setSnapshotUrl(null)
    setIsSnapshot(false)
    setBoxes([])
    setShowReview(false)
    setIsAnalyzing(false)
    setStatus('Camera ready')
  }

  // Find
  const handleFind = async () => {
    if (!query.trim()) return
    setFinding(true)
    setStatus(`Searching for "${query}"...`)
    setResults([])

    const captured = await captureFrame()
    const formData = new FormData()
    formData.append('query', query)
    if (captured) formData.append('file', captured.blob, 'frame.jpg')

    try {
      const res = await fetch('/api/find', { method: 'POST', body: formData })
      const data = await res.json()
      const matches = data.matches || []
      setResults(matches)
      setStatus(matches.length ? `Found ${matches.length} match(es)` : 'No matches found')
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
            <p className="text-[11px] text-gray-400 mt-0.5">
              {savedCount > 0 ? `${savedCount} place${savedCount > 1 ? 's' : ''} saved` : 'Visual memory for your world'}
            </p>
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

      {/* Main View */}
      <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
        {/* Live camera (hidden when snapshot is active) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isSnapshot ? 'hidden' : 'block'}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Frozen Snapshot */}
        {isSnapshot && snapshotUrl && (
          <img
            src={snapshotUrl}
            alt="Snapshot"
            className="w-full h-full object-cover"
          />
        )}

        {/* Scanning animation overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
            <div className="w-full h-1 bg-sky-500/80 absolute top-0 animate-[scan_1.4s_ease-in-out_infinite]" 
                 style={{ boxShadow: '0 0 20px 4px rgba(14,165,233,0.6)' }} />
            <p className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur">
              Analyzing scene...
            </p>
          </div>
        )}

        {/* Bounding boxes / pins on snapshot */}
        {boxes.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {boxes.map((box, i) => (
              <div
                key={i}
                className="absolute border-2 border-sky-400 rounded-lg transition-all duration-300"
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

        {/* Status pill */}
        {!isAnalyzing && (
          <div className="absolute top-4 left-4">
            <div className="bg-black/55 backdrop-blur-md text-sm px-3.5 py-1.5 rounded-full border border-white/10">
              {status}
            </div>
          </div>
        )}

        {/* Empty hint (only on live camera) */}
        {!isSnapshot && savedCount === 0 && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md text-sm text-gray-200 px-4 py-2 rounded-full border border-white/10">
              Point at a place and tap <span className="text-sky-400 font-medium">Remember</span>
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

      {/* Results from search */}
      {results.length > 0 && !isSnapshot && (
        <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-3 max-h-36 overflow-y-auto space-y-2">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-xl px-3.5 py-2.5">
              <div>
                <p className="font-medium text-[15px]">{r.object}</p>
                <p className="text-xs text-gray-400">{r.location}</p>
              </div>
              <span className="text-sky-400 text-sm font-semibold">{Math.round(r.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Controls */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4 space-y-3">
        {/* Review mode: Save / Retake */}
        {showReview ? (
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 bg-gray-800 hover:bg-gray-700 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium border border-gray-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-sky-600/20 transition"
            >
              <Save className="w-4 h-4" />
              Save to memory
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="flex gap-2.5">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                placeholder="Where is my blue charger?"
                disabled={isSnapshot}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500 transition disabled:opacity-50"
              />
              <button
                onClick={handleFind}
                disabled={finding || !query.trim() || isSnapshot}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 px-5 rounded-2xl flex items-center justify-center transition"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Remember button */}
            <button
              onClick={handleRemember}
              disabled={isSnapshot || isAnalyzing}
              className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition shadow-lg shadow-sky-600/20"
            >
              <Camera className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing...' : 'Remember this place'}
            </button>
          </>
        )}
      </div>

      {/* Tiny CSS for scan line */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

export default App
