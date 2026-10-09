import React from "react";
import Image from "next/image";

export const SplashScreen: React.FC = () => {
  return (
    <div className="crm-splash-screen" role="status" aria-live="polite">
      <div className="crm-splash-content">
        <div className="crm-splash-logo-wrap">
          <Image
            src="/login/LA VARENNE LOGO VR  white.png"
            alt="La Varenne"
            width={180}
            height={58}
            priority
            className="crm-splash-logo"
          />
        </div>
        <div className="crm-splash-spinner" aria-label="Chargement en cours" />
      </div>
    </div>
  );
};
