"use client";

import React from "react";
import { useKeycloakAuth } from "../hooks/useKeycloakAuth";
import LoginButton from "../components/Auth/LoginButton";
import LogoutButton from "../components/Auth/LogoutButton";
import Link from "next/link";

export default function HomePage() {
  const { keycloak, authenticated, loading, error } = useKeycloakAuth();

  if (loading) {
    return (
      <div className="container">
        <p>Sprawdzanie statusu uwierzytelnienia...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container error-message">
        <p>Wystąpił błąd: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Witaj na stronie głównej!</h1>
      {authenticated ? (
        <div>
          <p>
            Jesteś zalogowany jako:{" "}
            <strong>
              {keycloak?.tokenParsed?.preferred_username || "Użytkownik"}
            </strong>
          </p>
          {keycloak?.tokenParsed?.realm_access?.roles && (
            <p>Role: {keycloak.tokenParsed.realm_access.roles.join(", ")}</p>
          )}
          <LogoutButton />
          <nav style={{ marginTop: "20px" }}>
            <ul>
              <li>
                <Link href="/user">Panel Użytkownika</Link>
              </li>
              {keycloak?.hasRealmRole("admin") && (
                <li>
                  <Link href="/admin">Panel Administratora</Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      ) : (
        <div>
          <p>Nie jesteś zalogowany.</p>
          <LoginButton />
        </div>
      )}
    </div>
  );
}
