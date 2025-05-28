"use client";

import React from "react";
import { useKeycloakAuth } from "../../hooks/useKeycloakAuth";

const LoginButton = () => {
  const { keycloak, authenticated, error } = useKeycloakAuth();

  if (error) return null;
  if (!keycloak || authenticated) return null;

  const handleLogin = () => {
    keycloak.login();
  };

  return <button onClick={handleLogin}>Zaloguj</button>;
};

export default LoginButton;
