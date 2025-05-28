"use client";

import React, { useState, useEffect, createContext } from "react";
import getKeycloakInstance from "../../lib/keycloak";
import LoadingSpinner from "../UI/LoadingSpinner";

export const KeycloakContext = createContext(null);

const KeycloakProvider = ({ children }) => {
  const [keycloak, setKeycloak] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const kcInstance = getKeycloakInstance();

    if (!kcInstance) {
      setError(new Error("Keycloak instance could not be initialized."));
      setLoading(false);
      return;
    }

    kcInstance
      .init({
        onLoad: "check-sso",
        pkceMethod: "S256",
        silentCheckSsoRedirectUri:
          window.location.origin + "/silent-check-sso.html",
      })
      .then((auth) => {
        setKeycloak(kcInstance);
        setAuthenticated(auth);
        setLoading(false);

        if (auth) {
          kcInstance.onTokenExpired = () => {
            kcInstance.updateToken(30).catch(() => {
              setError(new Error("Failed to refresh token"));
              kcInstance.logout();
            });
          };
        }
      })
      .catch((initError) => {
        console.error("Keycloak init failed:", initError);
        setError(initError);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div>Error initializing Keycloak: {error.message}</div>;
  }

  return (
    <KeycloakContext.Provider
      value={{ keycloak, authenticated, loading, error }}
    >
      {children}
    </KeycloakContext.Provider>
  );
};

export default KeycloakProvider;
