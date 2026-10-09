"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface DocumentPreviewModalProps {
  type: "devis" | "facture";
  id: string;
  onClose: () => void;
  title?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  type,
  id,
  onClose,
  title,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const docTypeLabel = type === "devis" ? "Devis" : "Facture";
  const displayTitle = title || `${docTypeLabel} N° ${id}`;
  const docUrl = `/api/${type === "devis" ? "devis" : "factures"}/${encodeURIComponent(id)}/pdf`;

  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 10) / 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 10) / 10));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  // Handle keyboard shortcuts (Escape, Ctrl +, Ctrl -, Ctrl 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        onClose();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          handleResetZoom();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Handle Ctrl + Mouse Wheel on modal body container
  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        setZoom((prev) => {
          const next = Math.round((prev + delta) * 10) / 10;
          return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Handle iframe load, calculate full document height, and attach Ctrl+Wheel listener inside same-origin iframe
  const handleIframeLoad = () => {
    setIsLoading(false);

    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        const updateHeight = () => {
          if (!iframeRef.current || !doc.body) return;
          const contentHeight = Math.max(
            doc.body.scrollHeight || 0,
            doc.documentElement.scrollHeight || 0,
            doc.body.offsetHeight || 0
          );
          if (contentHeight > 0) {
            iframeRef.current.style.height = `${contentHeight + 24}px`;
          }
        };

        updateHeight();
        setTimeout(updateHeight, 200);
        setTimeout(updateHeight, 600);
      }

      const iframeWin = iframeRef.current?.contentWindow;
      if (iframeWin) {
        iframeWin.addEventListener(
          "wheel",
          (e: WheelEvent) => {
            if (e.ctrlKey) {
              e.preventDefault();
              const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
              setZoom((prev) => {
                const next = Math.round((prev + delta) * 10) / 10;
                return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
              });
            }
          },
          { passive: false }
        );
      }
    } catch (err) {
      console.warn("Could not calculate iframe height or attach wheel listener", err);
    }
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError("Impossible de charger l'aperçu du document.");
  };

  // Trigger print specifically for iframe content
  const handlePrint = useCallback(() => {
    if (!iframeRef.current) return;
    try {
      const win = iframeRef.current.contentWindow;
      if (win) {
        win.focus();
        win.print();
      } else {
        window.print();
      }
    } catch (err) {
      console.warn("Print error in iframe window, attempting direct trigger", err);
      window.print();
    }
  }, []);

  // Download PDF blob action
  const handleDownload = async () => {
    if (isDownloading) return;
    try {
      setIsDownloading(true);
      const downloadUrl = `/api/${type === "devis" ? "devis" : "factures"}/${encodeURIComponent(id)}/pdf?format=raw_pdf`;
      const res = await fetch(downloadUrl, {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) {
        let errMessage = "Erreur lors de la génération du fichier PDF.";
        try {
          const errData = await res.json();
          if (errData?.error) errMessage = errData.error;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }
      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Le fichier PDF généré est vide (0 octet).");
      }
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${type === "devis" ? "Devis" : "Facture"}_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      alert(err.message || "Erreur lors du téléchargement du document.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="doc-preview-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-preview-modal-title"
    >
      <div
        className="doc-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="doc-preview-head">
          <div className="doc-preview-head-info">
            <div className="doc-preview-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="doc-preview-head-titles">
              <h2 id="doc-preview-modal-title" className="doc-preview-title">
                {displayTitle}
              </h2>
              <div className="doc-preview-subtitle">
                Aperçu et impression du document commercial
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Zoom controls in header */}
            <div className="doc-preview-zoom-controls" role="toolbar" aria-label="Contrôles du zoom">
              <button
                type="button"
                className="zoom-btn"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                title="Zoom arrière (Ctrl + Molette bas)"
                aria-label="Zoom arrière"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button
                type="button"
                className="zoom-pct-btn"
                onClick={handleResetZoom}
                title="Réinitialiser le zoom à 100% (Ctrl + 0)"
                aria-label="Réinitialiser le zoom à 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className="zoom-btn"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                title="Zoom avant (Ctrl + Molette haut)"
                aria-label="Zoom avant"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="zoom-hint" title="Maintenez Ctrl et faites défiler la molette de la souris pour zoomer">
                Ctrl + Molette
              </span>
            </div>

            <button
              type="button"
              className="doc-preview-close"
              onClick={onClose}
              aria-label="Fermer la fenêtre (Échap)"
              title="Fermer (Échap)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body / Document Viewport */}
        <div className="doc-preview-body" ref={bodyRef}>
          {isLoading && (
            <div className="doc-preview-loading">
              <div className="doc-preview-spinner" />
              <div>Chargement de l&apos;aperçu du document...</div>
            </div>
          )}

          {loadError ? (
            <div className="empty-state" style={{ margin: "auto", color: "var(--danger)" }}>
              <p>{loadError}</p>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: "12px" }}
                onClick={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  if (iframeRef.current) {
                    iframeRef.current.src = docUrl;
                  }
                }}
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div
              className="doc-preview-zoom-container"
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minHeight: "fit-content",
                height: "auto",
                paddingBottom: zoom > 1 ? `${Math.round((zoom - 1) * 1200)}px` : "20px",
              }}
            >
              <div
                className="doc-preview-paper"
                style={{
                  height: "auto",
                  minHeight: "fit-content",
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  transition: "transform 0.12s ease-out",
                }}
              >
                <iframe
                  ref={iframeRef}
                  src={docUrl}
                  title={`Aperçu ${docTypeLabel} ${id}`}
                  className="doc-preview-iframe"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="doc-preview-foot">
          <button
            type="button"
            className="btn-ghost btn-ghost-close"
            onClick={onClose}
          >
            Fermer
          </button>

          <div className="doc-preview-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePrint}
              disabled={isLoading}
              title="Lancer l'impression directe du document"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Imprimer
            </button>

            <button
              type="button"
              className="btn"
              onClick={handleDownload}
              disabled={isDownloading || isLoading}
              title="Télécharger le fichier PDF officiel"
            >
              {isDownloading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Télécharger
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

