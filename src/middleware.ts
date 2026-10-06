import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "crm_token";

// Endpoints publics exemptés d'authentification
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/webhooks/meta",
  "/api/whatsapp", // GET (challenge) et POST (webhook entrant Meta)
  "/api/health",
  "/api/test-db",
];

function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ||
    "dev-only-secret-key-lavarenne-crm-2026-strict"
  );
}

/**
 * Décode et vérifie la signature HMAC-SHA256 du JWT en utilisant Web Crypto (compatible Edge runtime).
 */
async function verifyJwtInEdge(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Décodage base64url vers buffer binaire pour la signature
    const base64Sig = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    const paddedSig = base64Sig.padEnd(base64Sig.length + ((4 - (base64Sig.length % 4)) % 4), "=");
    const binarySig = Uint8Array.from(atob(paddedSig), (c) => c.charCodeAt(0));

    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify("HMAC", key, binarySig, dataToVerify);
    if (!isValid) return null;

    // Décodage du payload JSON
    const base64Payload = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = base64Payload.padEnd(base64Payload.length + ((4 - (base64Payload.length % 4)) % 4), "=");
    const payloadStr = atob(paddedPayload);
    const payload = JSON.parse(payloadStr);

    // Vérification de la date d'expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ne pas intercepter les fichiers statiques et assets Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Vérifier si l'URL est une route API protégée
  if (pathname.startsWith("/api")) {
    // Si c'est un endpoint public (login, webhooks), laisser passer
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }

    // Récupérer le token depuis le cookie de session
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Non authentifié. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    // Valider le token
    const secret = getJwtSecret();
    const user = await verifyJwtInEdge(token, secret);
    if (!user) {
      return NextResponse.json(
        { error: "Session invalide ou expirée." },
        { status: 401 }
      );
    }

    const role = (user.role || "").toLowerCase().trim();

    // =========================================================================
    // 3. ENFORCEMENT RBAC STRICT CÔTÉ SERVEUR
    // =========================================================================

    // RÈGLE 1 : Centre d'Appel (NO access to orders, devis, or factures)
    if (role === "centre_appel") {
      const isFinancialPath =
        pathname.startsWith("/api/commandes") ||
        pathname.startsWith("/api/devis") ||
        pathname.startsWith("/api/factures");

      if (isFinancialPath) {
        return NextResponse.json(
          {
            error:
              "Accès interdit (RBAC) : Le Centre d'Appel n'a pas accès aux commandes, devis et factures.",
          },
          { status: 403 }
        );
      }

      // Le Centre d'Appel n'a pas accès à la gestion de l'équipe / création d'utilisateurs
      if (
        pathname.startsWith("/api/users") &&
        !pathname.startsWith("/api/users/commerciaux") &&
        request.method !== "OPTIONS"
      ) {
        return NextResponse.json(
          { error: "Accès interdit : Réservé à l'administration." },
          { status: 403 }
        );
      }

      if (pathname.startsWith("/api/auth/impersonate")) {
        return NextResponse.json(
          { error: "Accès interdit : La fonction 'Voir comme' est réservée à l'administrateur." },
          { status: 403 }
        );
      }
    }

    // RÈGLE 2 : Commercial (Strictement restreint à sa marque et son portefeuille)
    if (role === "commercial") {
      // Bloquer l'accès à la gestion de l'équipe / création d'utilisateurs
      if (
        pathname.startsWith("/api/users") &&
        !pathname.startsWith("/api/users/commerciaux") &&
        request.method !== "OPTIONS"
      ) {
        return NextResponse.json(
          { error: "Accès interdit : Réservé à l'administration." },
          { status: 403 }
        );
      }

      // Bloquer l'impersonation "Voir comme"
      if (pathname.startsWith("/api/auth/impersonate")) {
        return NextResponse.json(
          { error: "Accès interdit : La fonction 'Voir comme' est réservée à l'administrateur." },
          { status: 403 }
        );
      }
    }

    // Passer les headers contextualisés à la route API
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", role);
    requestHeaders.set("x-user-brand", user.brand || "all");
    requestHeaders.set("x-user-name", encodeURIComponent(user.name || ""));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
