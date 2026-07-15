import { useState, useRef, useEffect, useCallback } from 'react';
import { ImageIcon, Loader2, X, ZoomIn } from 'lucide-react';

/**
 * Lazy-loading photo thumbnail with click-to-view modal.
 * Only loads the image when it enters the viewport (IntersectionObserver).
 * Does NOT keep images in cache/memory when not visible.
 */
export default function LazyPhoto({ src, alt = 'Foto', className = '', thumbClass = 'h-10 w-14' }) {
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!src || inView) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src, inView]);

  const openViewer = useCallback(() => {
    if (!src || error) return;
    setShowViewer(true);
    setViewerLoaded(false);
  }, [src, error]);

  const closeViewer = useCallback((e) => {
    e?.stopPropagation();
    setShowViewer(false);
    setViewerLoaded(false);
  }, []);

  if (!src) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <>
      <div ref={ref} className={`relative ${thumbClass} rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center ${className}`}>
        {inView && !loaded && !error && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
        {inView && !error && (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`h-full w-full object-cover cursor-pointer transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onClick={openViewer}
          />
        )}
        {inView && error && (
          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
        )}
        {!inView && (
          <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
        )}
        {loaded && (
          <button
            onClick={openViewer}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors"
          >
            <ZoomIn className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Full-size viewer modal — loads image on demand, unloads on close */}
      {showViewer && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          onClick={closeViewer}
        >
          <button
            onClick={closeViewer}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {!viewerLoaded && (
            <div className="absolute flex flex-col items-center gap-2 text-white/70">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Carregando foto...</span>
            </div>
          )}
          <img
            src={src}
            alt={alt}
            onLoad={() => setViewerLoaded(true)}
            onClick={(e) => e.stopPropagation()}
            className={`max-w-full max-h-full object-contain rounded-xl transition-opacity duration-200 ${viewerLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      )}
    </>
  );
}