"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Brand,
  PageKey,
  Client,
  Lead,
  Commande,
  Devis,
  Facture,
  CommercialUser,
  LeadStage,
} from "@/types/crm";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { LoginScreen } from "./LoginScreen";
import { Dashboard } from "./Dashboard";
import { ClientsTable } from "./ClientsTable";
import { KanbanBoard } from "./KanbanBoard";
import { CommandesTable } from "./CommandesTable";
import { DevisTable } from "./DevisTable";
import { FacturesTable } from "./FacturesTable";
import { EquipeList } from "./EquipeList";
import { FicheModal } from "./FicheModal";
import { EditModal } from "./EditModal";
import { CreateModal } from "./CreateModal";
import { WaModal } from "./WaModal";

export const CrmApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageKey>("dashboard");
  const [currentBrand, setCurrentBrand] = useState<Brand>("all");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Collections
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [commerciaux, setCommerciaux] = useState<CommercialUser[]>([]);
  const [team, setTeam] = useState<User[]>([]);

  // Modals state
  const [ficheLeadId, setFicheLeadId] = useState<string | null>(null);
  const [waLeadId, setWaLeadId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{ type: string; id: string; item: any } | null>(null);
  const [createType, setCreateType] = useState<"client" | "lead" | "commande" | "devis" | "facture" | null>(null);

  // API helper
  const fetchApi = useCallback(async (path: string, options?: RequestInit) => {
    const res = await fetch("/api" + path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (res.status === 401) {
      setUser(null);
      throw new Error("unauthenticated");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erreur serveur");
    }
    return data;
  }, []);

  // Load all CRM collections
  const loadAll = useCallback(
    async (brandOverride?: Brand, userOverride?: User) => {
      const activeUser = userOverride || user;
      if (!activeUser) return;

      const activeBrand = brandOverride !== undefined ? brandOverride : currentBrand;
      const brandQ = activeUser.role === "admin" && activeBrand !== "all" ? `?brand=${activeBrand}` : "";

      try {
        const calls: Promise<any>[] = [
          fetchApi("/clients" + brandQ),
          fetchApi("/leads" + brandQ),
          fetchApi("/commandes" + brandQ),
          fetchApi("/devis" + brandQ),
          fetchApi("/factures" + brandQ),
          fetchApi("/users/commerciaux"),
        ];

        if (activeUser.role === "admin") {
          calls.push(fetchApi("/users"));
        }

        const [clientsR, leadsR, commandesR, devisR, facturesR, commerciauxR, teamR] =
          await Promise.all(calls);

        setClients(
          (clientsR.clients || []).map((c: any) => ({
            ...c,
            brands: typeof c.brands === "string" ? c.brands.split(",") : c.brands || [],
          }))
        );

        setLeads(
          (leadsR.leads || []).map((l: any) => ({
            ...l,
            date: l.date_label || l.date || "—",
            metaNote: l.meta_note || l.metaNote,
            fiche: l.fiche_interet
              ? {
                  besoin: l.fiche_besoin,
                  budget: l.fiche_budget,
                  dispo: l.fiche_dispo,
                  notes: l.fiche_notes,
                  interet: l.fiche_interet,
                  qualifiePar: l.fiche_qualifie_par,
                }
              : l.fiche || null,
          }))
        );

        setCommandes(commandesR.commandes || []);
        setDevis(devisR.devis || []);
        setFactures(facturesR.factures || []);
        setCommerciaux(commerciauxR.commerciaux || []);
        setTeam(teamR ? teamR.users || [] : []);
      } catch (err: any) {
        if (err.message !== "unauthenticated") {
          console.error("Failed to load CRM data:", err);
        }
      }
    },
    [user, currentBrand, fetchApi]
  );

  // Check initial session
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApi("/auth/me");
        setUser(data.user);
        await loadAll(currentBrand, data.user);
      } catch {
        setUser(null);
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginSuccess = async (loggedUser: User) => {
    setUser(loggedUser);
    setCurrentBrand("all");
    setCurrentPage("dashboard");
    await loadAll("all", loggedUser);
  };

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setUser(null);
    setIsMobileSidebarOpen(false);
  };

  const handleBrandChange = async (newBrand: Brand) => {
    setCurrentBrand(newBrand);
    await loadAll(newBrand);
  };

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );
    await fetchApi(`/leads/${leadId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage: newStage }),
    });
  };

  const handleFicheSubmit = async (leadId: string, payload: any) => {
    await fetchApi(`/leads/${leadId}/fiche`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadAll();
  };

  const handleSendMessage = async (leadId: string, text: string) => {
    // Optimistic update
    const newMessage = { from: "moi" as const, text, created_at: new Date().toISOString() };
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, messages: [...(l.messages || []), newMessage] }
          : l
      )
    );
    await fetchApi(`/leads/${leadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text, from_side: "moi" }),
    });
  };

  const handleSimulateMeta = async () => {
    await fetchApi("/leads/simulate-meta", { method: "POST" });
    await loadAll();
  };

  const handleViewAs = async (userId: string) => {
    try {
      const data = await fetchApi(`/auth/impersonate/${userId}`, { method: "POST" });
      setUser(data.user);
      setCurrentBrand("all");
      setCurrentPage("dashboard");
      await loadAll("all", data.user);
    } catch (e: any) {
      alert(e.message || "Impossible d'accéder à cet espace.");
    }
  };

  const handleReturnAdmin = async () => {
    try {
      const data = await fetchApi("/auth/return-admin", { method: "POST" });
      setUser(data.user);
      setCurrentBrand("all");
      setCurrentPage("dashboard");
      await loadAll("all", data.user);
    } catch (e: any) {
      alert(e.message || "Session administrateur expirée, veuillez vous reconnecter.");
      setUser(null);
    }
  };

  const handleOpenEdit = (type: string, id: string) => {
    let item: any = null;
    if (type === "client") item = clients.find((c) => c.id === id);
    else if (type === "lead") item = leads.find((l) => l.id === id);
    else if (type === "commande") item = commandes.find((c) => c.id === id);
    else if (type === "devis") item = devis.find((d) => d.id === id);
    else if (type === "facture") item = factures.find((f) => f.id === id);

    if (item) {
      setEditTarget({ type, id, item });
    }
  };

  const handleSaveEdit = async (type: string, id: string, data: any) => {
    const collectionMap: Record<string, string> = {
      client: "clients",
      lead: "leads",
      commande: "commandes",
      devis: "devis",
      facture: "factures",
    };
    const endpoint = collectionMap[type] || type;
    await fetchApi(`/${endpoint}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet élément définitivement ?")) {
      return;
    }
    const collectionMap: Record<string, string> = {
      client: "clients",
      lead: "leads",
      commande: "commandes",
      devis: "devis",
      facture: "factures",
    };
    const endpoint = collectionMap[type] || type;
    try {
      await fetchApi(`/${endpoint}/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression.");
    }
  };

  const handleCreateRecord = async (type: string, data: any) => {
    const collectionMap: Record<string, string> = {
      client: "clients",
      lead: "leads",
      commande: "commandes",
      devis: "devis",
      facture: "factures",
    };
    const endpoint = collectionMap[type] || type;
    await fetchApi(`/${endpoint}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  if (loadingInitial) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--gold)",
          fontFamily: "'Fraunces', serif",
          fontSize: "1.2rem",
        }}
      >
        Chargement du CRM...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const leadsCount =
    user.role === "centre_appel"
      ? leads.filter((l) => l.stage === "a_qualifier").length
      : leads.filter((l) => l.stage !== "converti" && l.stage !== "perdu").length;

  const activeFicheLead = ficheLeadId ? leads.find((l) => l.id === ficheLeadId) || null : null;
  const activeWaLead = waLeadId ? leads.find((l) => l.id === waLeadId) || null : null;

  return (
    <div className="app">
      <Sidebar
        user={user}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        leadsCount={leadsCount}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <main>
        <Topbar
          user={user}
          currentPage={currentPage}
          currentBrand={currentBrand}
          onBrandChange={handleBrandChange}
          onReturnAdmin={handleReturnAdmin}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        <div className="content">
          {currentPage === "dashboard" && (
            <Dashboard
              user={user}
              leads={leads}
              commandes={commandes}
              factures={factures}
              onOpenFiche={(id) => setFicheLeadId(id)}
              onSimulateMeta={handleSimulateMeta}
            />
          )}

          {currentPage === "clients" && (
            <ClientsTable
              user={user}
              clients={clients}
              onEdit={(type, id) => handleOpenEdit(type, id)}
              onDelete={(type, id) => handleDeleteItem(type, id)}
              onCreateNew={() => setCreateType("client")}
            />
          )}

          {currentPage === "leads" && (
            <KanbanBoard
              user={user}
              leads={leads}
              commerciaux={commerciaux}
              onStageChange={handleStageChange}
              onOpenFiche={(id) => setFicheLeadId(id)}
              onOpenWa={(id) => setWaLeadId(id)}
              onEditLead={(id) => handleOpenEdit("lead", id)}
              onDeleteLead={(id) => handleDeleteItem("lead", id)}
              onSimulateMeta={handleSimulateMeta}
              onCreateLead={() => setCreateType("lead")}
            />
          )}

          {currentPage === "commandes" && (
            <CommandesTable
              user={user}
              commandes={commandes}
              onEdit={(type, id) => handleOpenEdit(type, id)}
              onDelete={(type, id) => handleDeleteItem(type, id)}
              onCreateNew={() => setCreateType("commande")}
            />
          )}

          {currentPage === "devis" && (
            <DevisTable
              user={user}
              devis={devis}
              onEdit={(type, id) => handleOpenEdit(type, id)}
              onDelete={(type, id) => handleDeleteItem(type, id)}
              onCreateNew={() => setCreateType("devis")}
            />
          )}

          {currentPage === "factures" && (
            <FacturesTable
              user={user}
              factures={factures}
              onEdit={(type, id) => handleOpenEdit(type, id)}
              onDelete={(type, id) => handleDeleteItem(type, id)}
              onCreateNew={() => setCreateType("facture")}
            />
          )}

          {currentPage === "equipe" && user.role === "admin" && (
            <EquipeList team={team} onViewAs={handleViewAs} />
          )}
        </div>
      </main>

      {/* Modals */}
      {activeFicheLead && (
        <FicheModal
          lead={activeFicheLead}
          commerciaux={commerciaux}
          onClose={() => setFicheLeadId(null)}
          onSubmit={handleFicheSubmit}
        />
      )}

      {editTarget && (
        <EditModal
          target={editTarget}
          commerciaux={commerciaux}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
        />
      )}

      {createType && (
        <CreateModal
          type={createType}
          user={user}
          commerciaux={commerciaux}
          clients={clients}
          onClose={() => setCreateType(null)}
          onCreate={handleCreateRecord}
        />
      )}

      {activeWaLead && (
        <WaModal
          lead={activeWaLead}
          onClose={() => setWaLeadId(null)}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};
