import { useEffect, useRef, useState } from 'react'
import { Camera, Search, Bookmark, Zap, ZapOff, Trash2 } from 'lucide-react'

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
          video: { facingMode: 'environment' }, // prefer back camera
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Camera className="w-6 h-6 text-sky-400" />
          <h1 className="text-lg font-semibold">Find My Stuff</h1>
        </div>

        <button
          onClick={() => setLiveMode(!liveMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            liveMode
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'bg-gray-800 text-gray-300 border border-gray-700'
          }`}
        >
          {liveMode ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          {liveMode ? 'Live Mode' : 'Smart Mode'}
        </button>
      </header>

      {/* Camera View */}
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Status overlay */}
        <div className="absolute top-3 left-3 right-3">
          <div className="bg-black/60 backdrop-blur-sm text-sm px-3 py-1.5 rounded-lg inline-block">
            {status}
          </div>
        </div>

        {liveMode && (
          <div className="absolute top-3 right-3 bg-amber-500/90 text-black text-xs font-bold px-2 py-1 rounded">
            LIVE • uses more credits
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-gray-900 border-t border-gray-800 p-4 max-h-40 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <p className="font-medium">{r.object}</p>
                <p className="text-sm text-gray-400">{r.location}</p>
              </div>
              <span className="text-sky-400 text-sm">{Math.round(r.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-800 p-4 space-y-3">
        {/* Search input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFind()}
            placeholder="Where is my blue charger?"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleFind}
            disabled={finding || !query.trim()}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 rounded-xl flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleRemember}
            disabled={remembering}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Bookmark className="w-4 h-4" />
            {remembering ? 'Remembering...' : 'Remember this place'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
