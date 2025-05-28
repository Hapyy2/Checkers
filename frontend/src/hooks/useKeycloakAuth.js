"use client";

import { useContext } from "react";
import { KeycloakContext } from "../components/Auth/KeycloakProvider";

export const useKeycloakAuth = () => {
  const context = useContext(KeycloakContext);
  if (context === undefined || context === null) {
    throw new Error("useKeycloakAuth must be used within a KeycloakProvider");
  }
  return context;
};
