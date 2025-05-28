"use client";

import React, { useEffect } from "react";
import { useKeycloakAuth } from "../../hooks/useKeycloakAuth";
import { useRouter } from "next/navigation";
import LoadingSpinner from "../../components/UI/LoadingSpinner";
import Link from "next/link";
import LogoutButton from "../../components/Auth/LogoutButton";

export default function DashboardLayout({ children }) {
  const { keycloak, authenticated, loading, error } = useKeycloakAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated && !error) {
      if (keycloak) {
        keycloak.login();
      } else {
        router.push("/");
      }
    }
  }, [loading, authenticated, keycloak, router, error]);

  if (loading) {
    return (
      <div className="container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container error-message">
        <p>Wystąpił błąd podczas próby uwierzytelnienia: {error.message}</p>
        <p>
          <Link href="/">Wróć na stronę główną</Link>
        </p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="container">
        <p>Przekierowywanie do logowania...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <nav>
        <ul>
          <li>
            <Link href="/">Strona Główna</Link>
          </li>
          <li>
            <Link href="/user">Panel Użytkownika</Link>
          </li>
          {keycloak?.hasRealmRole("admin") && (
            <li>
              <Link href="/admin">Panel Administratora</Link>
            </li>
          )}
          <li style={{ float: "right" }}>
            <LogoutButton />
          </li>
        </ul>
      </nav>
      <div>{children}</div>
    </div>
  );
}
