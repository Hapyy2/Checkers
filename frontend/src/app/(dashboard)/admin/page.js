"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useKeycloakAuth } from "../../../hooks/useKeycloakAuth";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const { keycloak, authenticated } = useKeycloakAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasksForAdmin = useCallback(
    async (userIdToFetch) => {
      if (
        keycloak &&
        keycloak.token &&
        authenticated &&
        keycloak.hasRealmRole("admin")
      ) {
        setApiError(null);
        setIsLoading(true);
        setTasks([]);
        try {
          await keycloak.updateToken(5);

          let apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/gw/tasks/tasks`;
          if (userIdToFetch) {
            apiUrl += `?userId=${encodeURIComponent(userIdToFetch)}`;
          }

          const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${keycloak.token}`,
            },
          });

          const responseBody = await response.text();
          if (!response.ok) {
            throw new Error(
              `HTTP error! status: ${response.status}, message: ${responseBody}`
            );
          }
          const data = JSON.parse(responseBody);
          setTasks(data || []);
        } catch (error) {
          console.error("Błąd pobierania zadań (Admin):", error);
          setApiError(error.message);
          setTasks([]);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [keycloak, authenticated]
  );

  useEffect(() => {
    if (keycloak && authenticated) {
      if (!keycloak.hasRealmRole("admin")) {
        alert("Brak uprawnień administratora. Przekierowywanie...");
        router.push("/user");
      } else {
        fetchTasksForAdmin("");
      }
    }
  }, [keycloak, authenticated, router, fetchTasksForAdmin]);

  const handleFetchUserTasks = (e) => {
    e.preventDefault();
    fetchTasksForAdmin(targetUserId.trim());
  };

  if (!keycloak || !authenticated) {
    return (
      <p className="info-message">
        Ładowanie danych użytkownika lub wymagane logowanie...
      </p>
    );
  }

  if (!keycloak.hasRealmRole("admin")) {
    return (
      <p className="error-message">
        Brak uprawnień administratora. Ta strona jest tylko dla adminów.
      </p>
    );
  }

  return (
    <div>
      <h1>Panel Administratora</h1>
      <p>
        Witaj,{" "}
        <strong>
          {keycloak.tokenParsed?.preferred_username || "administratorze"}
        </strong>
        !
      </p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <h2>Wyświetl Zadania Użytkownika</h2>
        <form onSubmit={handleFetchUserTasks}>
          <div>
            <label htmlFor="targetUserId">ID Użytkownika (opcjonalne): </label>
            <input
              type="text"
              id="targetUserId"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="Wpisz ID użytkownika z Keycloak"
              style={{ minWidth: "300px", marginBottom: "10px" }}
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Ładowanie..." : "Pobierz Zadania"}
          </button>
        </form>
      </div>

      {apiError && (
        <div style={{ marginTop: "20px", color: "red" }}>
          <h2>Błąd API:</h2>
          <pre>{apiError}</pre>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <h2>
          {targetUserId
            ? `Zadania dla użytkownika ${targetUserId}`
            : "Wszystkie zadania w systemie"}
        </h2>
        {isLoading && <p>Ładowanie zadań...</p>}
        {!isLoading && tasks.length > 0 ? (
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong> (ID Użytkownika: {task.userId},
                Status: {task.status})
                {task.description && <p>{task.description}</p>}
                {task.project && (
                  <p>
                    Projekt: {task.project.name} (ID: {task.project.id})
                  </p>
                )}
                {task.category && <p>Kategoria: {task.category.name}</p>}
              </li>
            ))}
          </ul>
        ) : (
          !isLoading && (
            <p>
              Brak zadań do wyświetlenia lub nie wyszukano jeszcze użytkownika.
            </p>
          )
        )}
      </div>
    </div>
  );
}
