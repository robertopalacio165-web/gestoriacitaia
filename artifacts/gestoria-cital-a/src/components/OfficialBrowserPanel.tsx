import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ExternalLink, Shield, AlertTriangle } from "lucide-react";

type OfficialBrowserPanelProps = {
  url: string;
  title?: string;
  avatarImage?: string;
  className?: string;
};

export function OfficialBrowserPanel({
  url,
  title,
  avatarImage,
  className = "",
}: OfficialBrowserPanelProps) {
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const safeTitle = title || "Sede oficial";
  const displayUrl = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }, [url]);

  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);

    const timer = window.setTimeout(() => {
      setLoading(false);
      setLoadFailed(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [url, frameKey]);

  const handleRefresh = () => {
    setLoading(true);
    setLoadFailed(false);
    setFrameKey((v) => v + 1);
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`flex-1 flex flex-col rounded-2xl overflow-hidden border border-gray-300 shadow-2xl bg-white min-h-[400px] ${className}`}
    >
      <div className="bg-[#f1f3f4] border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 flex-1 border border-gray-200 shadow-sm min-w-0">
          <Shield className="w-3 h-3 text-green-600 shrink-0" />
          <span className="text-xs text-gray-600 font-medium truncate">
            {displayUrl}
          </span>
        </div>

        <button
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded"
          type="button"
          onClick={handleRefresh}
          title="Recargar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded"
          type="button"
          onClick={handleOpenExternal}
          title="Abrir fuera"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        {avatarImage ? (
          <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-primary shrink-0">
            <img
              src={avatarImage}
              className="w-full h-full object-cover object-top"
              alt=""
            />
          </div>
        ) : null}
      </div>

      <div className="relative flex-1 bg-white">
        {!loadFailed && (
          <iframe
            key={`${url}-${frameKey}`}
            src={url}
            title={safeTitle}
            className="w-full h-full border-0"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => {
              setLoading(false);
              setLoadFailed(false);
            }}
          />
        )}

        {loading && !loadFailed && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-8 h-8 mx-auto mb-3 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-700">
                Cargando página oficial…
              </p>
              <p className="text-xs text-gray-500 mt-1">{displayUrl}</p>
            </div>
          </div>
        )}

        {loadFailed && (
          <div className="absolute inset-0 bg-white flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>

              <h3 className="text-lg font-bold text-[#003366] mb-2">
                La web oficial no se deja incrustar aquí
              </h3>

              <p className="text-sm text-gray-600 mb-5">
                Tu diseño sigue igual. Pulsa abajo y se abrirá la sede oficial real
                en una pestaña nueva para continuar el trámite.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="inline-flex items-center justify-center gap-2 bg-[#003366] hover:bg-[#002244] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir sede oficial
                </button>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reintentar
                </button>
              </div>

              <p className="text-[11px] text-gray-400 mt-4 break-all">{url}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
