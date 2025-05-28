"use client";

import React from "react";
import { useKeycloakAuth } from "../../hooks/useKeycloakAuth";

const LogoutButton = () => {
  const { keycloak, authenticated, error } = useKeycloakAuth();

  if (error) return null;
  if (!keycloak || !authenticated) return null;

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  return <button onClick={handleLogout}>Wyloguj</button>;
};

export default LogoutButton;
