"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lead, LeadMessage, User } from "@/types/crm";

interface WaModalProps {
  lead: Lead | null;
  user?: User | null;
  onClose: () => void;
  onSendMessage: (leadId: string, text: string) => Promise<void>;
}


export const WaModal: React.FC<WaModalProps> = ({
  lead,
  user,
  onClose,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  // Synchronisation initiale des messages du lead
  useEffect(() => {
    isMountedRef.current = true;
    if (lead?.messages) {
      setMessages(lead.messages);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [lead?.id, lead?.messages]);

  // Fonction de rechargement des messages depuis l'API
  const fetchMessages = useCallback(async (isPolling = false) => {
    if (!lead?.id) return;
    if (!isPolling) setLoadingHistory(true);

    try {
      const res = await fetch(`/api/leads/${lead.id}/messages`, {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && isMountedRef.current) {
        setMessages((prev) => {
          if (
            prev.length === data.messages.length &&
            JSON.stringify(prev) === JSON.stringify(data.messages)
          ) {
            return prev;
          }
          return data.messages;
        });
      }
    } catch {
      // Ignore polling errors
    } finally {
      if (!isPolling && isMountedRef.current) {
        setLoadingHistory(false);
      }
    }
  }, [lead?.id]);

  // Chargement à l'ouverture + Polling en temps réel toutes les 4.5s
  useEffect(() => {
    fetchMessages(false);

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 4500);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll automatique en bas de discussion
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Échappement clavier pour fermer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!lead) return null;

  const initialsOf = (name: string) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "PB";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const firstName = (lead.client || "").split(" ")[0] || "";

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    if (!lead.tel) {
      setErrorNotice("Ce prospect n'a pas de numéro de téléphone enregistré.");
      return;
    }

    setErrorNotice(null);
    setSending(true);

    const optimisticMsg: LeadMessage = {
      id: Date.now(),
      lead_id: lead.id,
      from: "moi",
      from_side: "moi",
      direction: "outbound",
      phone: lead.tel,
      text,
      status: "sent",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");

    try {
      await onSendMessage(lead.id, text);
      setTimeout(() => fetchMessages(true), 600);
    } catch (err: any) {
      setErrorNotice(err.message || "Erreur lors de l'envoi du message WhatsApp.");
    } finally {
      setSending(false);
    }
  };


  // Formatage des heures (ex: "14:32")
  const formatMsgTime = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Formatage de date groupée
  const formatMsgDate = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return "";
      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
      if (isToday) return "Aujourd'hui";
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  const brandOrSourceLabel =
    lead.brand === "lv"
      ? "La Varenne"
      : lead.brand === "lvt"
      ? "La Varenne Touch"
      : lead.source === "facebook"
      ? "Facebook Ads"
      : lead.source === "instagram"
      ? "Instagram Ads"
      : lead.source || "La Varenne";

  return (
    <div className="wa-overlay" onClick={onClose}>
      <div
        className="wa-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-chat-lead-name"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="wa-header">
          <div className="wa-header-left">
            <div className="wa-avatar">
              {initialsOf(lead.client)}
              <span className="wa-avatar-badge" title="Canal WhatsApp actif" />
            </div>

            <div className="wa-header-meta">
              <h3 id="wa-chat-lead-name" className="wa-header-name">
                {lead.client}
              </h3>

              <span className="wa-location-pill">
                <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
                {(lead as any).ville || brandOrSourceLabel}
              </span>

              {lead.tel && (
                <span className="wa-phone-row">
                  <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 3.99c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-.99-1.11z" />
                  </svg>
                  {lead.tel}
                </span>
              )}
            </div>
          </div>

          <div className="wa-header-actions">
            <button type="button" className="wa-action-btn" aria-label="Plus d'options" title="Plus d'options">
              <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            <button type="button" className="wa-action-btn" onClick={onClose} aria-label="Fermer la conversation" title="Fermer (Échap)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {errorNotice && (
          <div className="wa-error-banner">
            <span>{errorNotice}</span>
            <button type="button" className="wa-error-dismiss" onClick={() => setErrorNotice(null)}>✕</button>
          </div>
        )}

        {/* ── CHAT BODY ── */}
        <div className="wa-body">
          {messages && messages.length > 0 ? (
            <>
              {messages.map((m, idx) => {
                const isMe =
                  m.from === "moi" ||
                  m.from_side === "moi" ||
                  m.direction === "outbound";
                const showDate =
                  idx === 0 ||
                  formatMsgDate(messages[idx - 1]?.created_at) !==
                    formatMsgDate(m.created_at);

                return (
                  <React.Fragment key={m.id || idx}>
                    {showDate && m.created_at && (
                      <div className="wa-date-sep">
                        <span>{formatMsgDate(m.created_at)}</span>
                      </div>
                    )}

                    <div className={`wa-msg-row ${isMe ? "me" : "them"}`}>
                      <div className={`wa-bubble ${isMe ? "me" : "them"}`}>
                        <p style={{ margin: 0 }}>{m.text}</p>
                        <div className="wa-bubble-meta">
                          <span>{formatMsgTime(m.created_at)}</span>
                          {isMe && (
                            <span title={`Statut : ${m.status || "sent"}`}>
                              {m.status === "read" ? (
                                <span className="wa-tick-read">✓✓</span>
                              ) : m.status === "delivered" ? (
                                <span className="wa-tick-delivered">✓✓</span>
                              ) : m.status === "failed" ? (
                                <span className="wa-tick-failed" title="Échec d'envoi">!</span>
                              ) : (
                                <span className="wa-tick-sent">✓</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={threadEndRef} />
            </>
          ) : (
            <div className="wa-empty" ref={threadEndRef} />
          )}
        </div>

        {/* ── FOOTER & INPUT BAR ── */}
        <div className="wa-footer">
          <form className="wa-input-pill" onSubmit={handleSend}>
            <button
              type="button"
              className="wa-emoji-btn"
              onClick={() => inputRef.current?.focus()}
              aria-label="Insérer un emoji"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>

            <input
              ref={inputRef}
              type="text"
              placeholder={`Écrire un message à ${lead.client || "ce prospect"}…`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={sending || !lead.tel}
              aria-label="Message WhatsApp"
            />

            <button
              type="submit"
              className="wa-btn-send"
              disabled={sending || !inputText.trim() || !lead.tel}
              aria-label="Envoyer le message WhatsApp"
              title="Envoyer (Entrée)"
            >
              {sending ? (
                <span className="wa-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={17} height={17} style={{ transform: "translate(-1px, 1px)" }}>
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              )}
            </button>
          </form>

          <div className="wa-footer-security">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>WhatsApp Cloud API · Messages chiffrés &amp; archivés dans le CRM</span>
          </div>
        </div>

      </div>
    </div>
  );
};

