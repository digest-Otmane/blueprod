"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lead } from "@/types/crm";

interface WaModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSendMessage: (leadId: string, text: string) => Promise<void>;
}

export const WaModal: React.FC<WaModalProps> = ({
  lead,
  onClose,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lead?.messages]);

  if (!lead) return null;

  const initialsOf = (name: string) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || loading) return;

    setLoading(true);
    try {
      await onSendMessage(lead.id, text);
      setInputText("");
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'envoi du message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wa-overlay" onClick={onClose}>
      <div
        className="wa-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wa-modal-head">
          <div className="wa-avatar">{initialsOf(lead.client)}</div>
          <div>
            <div className="who">{lead.client}</div>
            <div className="sub2">{lead.tel || "Numéro non renseigné"}</div>
          </div>
          <button
            type="button"
            className="wa-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="wa-thread">
          {lead.messages && lead.messages.length > 0 ? (
            lead.messages.map((m, idx) => (
              <div
                key={m.id || idx}
                className={`wa-bubble ${m.from === "moi" || m.from_side === "moi" ? "moi" : "eux"}`}
              >
                {m.text}
              </div>
            ))
          ) : (
            <p className="sub" style={{ padding: "16px", textAlign: "center" }}>
              Aucun message pour ce lead.
            </p>
          )}
          <div ref={threadEndRef} />
        </div>

        <form className="wa-compose" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Écrire un message…"
            autoComplete="off"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="wa-send" aria-label="Envoyer" disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                d="M4 12 20 4l-6.5 16-3-6.5L4 12Z"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
