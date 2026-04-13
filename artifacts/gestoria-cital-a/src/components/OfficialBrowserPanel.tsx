import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ExternalLink, Shield, AlertTriangle } from "lucide-react";

type OfficialBrowserPanelProps = {
  url: string;
  title?: string;
  avatarImage?: string;
};

export function OfficialBrowserPanel({
  url,
  title,
  avatarImage,
}: OfficialBrowserPanelProps) {
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const displayUrl = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }, [url]);

  useEffect(() => {
    setLoading(true);
    setBlocked(false);

    const timer = setTimeout(() => {
      setBlocked(true);
      setLoading(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [url, frameKey]);

  return (
    <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-gray-300 shadow-2xl bg-white">
      
      {/* TOP BAR */}
      <div className="bg-gray-100 border-b px-3 py-2 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full flex-1 border">
          <Shield className="w-3 h-3 text-green-600" />
          <span className="text-xs text-gray-600 truncate">{displayUrl}</span>
        </div>

        <button onClick={() => setFrameKey(v => v + 1)}>
          <RefreshCw className="w-4 h-4" />
        </button>

        <button onClick={() => window.open(url, "_blank")}>
          <ExternalLink className="w-4 h-4" />
        </button>

        {avatarImage && (
          <img src={avatarImage} className="w-6 h-6 rounded-full" />
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 relative">

        {!blocked && (
          <iframe
            key={frameKey}
            src={url}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
          />
        )}

        {loading && !blocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <p className="text-sm">Cargando página oficial...</p>
          </div>
        )}

        {blocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
            <p className="text-sm mb-3">
              La web oficial no permite abrirse aquí
            </p>

            <button
              onClick={() => window.open(url, "_blank")}
              className="bg-[#003366] text-white px-4 py-2 rounded"
            >
              Abrir página oficial
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
