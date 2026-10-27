import { useEffect, useRef, useState } from 'react'
import { Search, Bookmark, Zap, Eye, MapPin } from 'lucide-react'

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

  // Start camera on load
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

  // Capture current frame as blob
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

  // Remember current view
  const handleRemember = async () => {
    setRemembering(true)
    setStatus('Remembering this place...')
    const blob = await captureFrame()
    if (!blob) {
      setStatus('Failed to capture frame')
      setRemembering(false)
      return
    }

    const formData = new FormData()
    formData.append('file', blob, 'frame.jpg')
    formData.append('location', 'Current view')

    try {
      const res = await fetch('/api/remember', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setStatus(`Remembered ${data.objects?.length || 0} objects`)
    } catch (err) {
      setStatus('Remember failed (backend offline?)')
    }
    setRemembering(false)
  }

  // Find object
  const handleFind = async () => {
    if (!query.trim()) return
    setFinding(true)
    setStatus(`Searching for "${query}"...`)
    setResults([])

    const blob = await captureFrame()
    const formData = new FormData()
    formData.append('query', query)
    if (blob) formData.append('file', blob, 'frame.jpg')

    try {
      const res = await fetch('/api/find', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setResults(data.matches || [])
      setStatus(data.matches?.length ? `Found ${data.matches.length} match(es)` : 'No matches yet')
    } catch (err) {
      setStatus('Find failed (backend offline?)')
    }
    setFinding(false)
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-800/80 bg-gray-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-none">Find My Stuff</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Visual memory for your world</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-900 rounded-full p-1 border border-gray-800">
          <button
            onClick={() => setLiveMode(false)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              !liveMode
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Smart
          </button>
          <button
            onClick={() => setLiveMode(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              liveMode
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Live
          </button>
        </div>
      </header>

      {/* Camera View - takes remaining space but can shrink */}
      <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Status overlay */}
        <div className="absolute top-4 left-4">
          <div className="bg-black/50 backdrop-blur-md text-sm px-3.5 py-1.5 rounded-full border border-white/10">
            {status}
          </div>
        </div>

        {liveMode && (
          <div className="absolute top-4 right-4 bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
            LIVE
          </div>
        )}
      </div>

      {/* Results (only when there are results) */}
      {results.length > 0 && (
        <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-3 max-h-36 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0">
              <div>
                <p className="font-medium text-[15px]">{r.object}</p>
                <p className="text-sm text-gray-400">{r.location}</p>
              </div>
              <span className="text-sky-400 text-sm font-medium">{Math.round(r.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls - always visible */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4 space-y-3">
        <div className="flex gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFind()}
            placeholder="Where is my blue charger?"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500 transition"
          />
          <button
            onClick={handleFind}
            disabled={finding || !query.trim()}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 px-5 rounded-2xl flex items-center justify-center transition"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleRemember}
          disabled={remembering}
          className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium transition border border-gray-700"
        >
          <Bookmark className="w-4 h-4" />
          {remembering ? 'Remembering...' : 'Remember this place'}
        </button>
      </div>
    </div>
  )
}

export default App
