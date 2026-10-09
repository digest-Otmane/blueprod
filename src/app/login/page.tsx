"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.push("/");
  };

  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
}
