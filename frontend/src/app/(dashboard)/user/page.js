"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useKeycloakAuth } from "../../../hooks/useKeycloakAuth";

export default function UserDashboardPage() {
  const { keycloak, authenticated } = useKeycloakAuth();
  const [tasks, setTasks] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (keycloak && keycloak.token && authenticated) {
      setApiError(null);
      setIsLoadingTasks(true);
      try {
        await keycloak.updateToken(5);
        const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/gw/tasks/tasks`;
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
        console.error("Błąd pobierania zadań:", error);
        setApiError(error.message);
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    }
  }, [keycloak, authenticated]);

  useEffect(() => {
    if (authenticated && keycloak) {
      fetchTasks();
    }
  }, [authenticated, keycloak, fetchTasks]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setApiError("Tytuł zadania jest wymagany.");
      return;
    }
    if (keycloak && keycloak.token && authenticated) {
      setApiError(null);
      setIsAddingTask(true);
      try {
        await keycloak.updateToken(5);
        const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/gw/tasks/tasks`;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newTaskTitle,
            description: newTaskDescription,
          }),
        });
        const responseBody = await response.text();
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${responseBody}`
          );
        }
        setNewTaskTitle("");
        setNewTaskDescription("");
        fetchTasks();
        alert("Zadanie dodane pomyślnie!");
      } catch (error) {
        console.error("Błąd dodawania zadania:", error);
        setApiError(error.message);
      } finally {
        setIsAddingTask(false);
      }
    } else {
      setApiError(
        "Nie można dodać zadania: brak tokenu lub użytkownik niezalogowany."
      );
    }
  };

  if (!keycloak || !authenticated) {
    return (
      <p className="info-message">
        Ładowanie danych użytkownika lub wymagane logowanie...
      </p>
    );
  }

  return (
    <div>
      <h1>Panel Użytkownika</h1>
      <p>
        Witaj,{" "}
        <strong>
          {keycloak.tokenParsed?.preferred_username || "użytkowniku"}
        </strong>
        !
      </p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <h2>Dodaj Nowe Zadanie</h2>
        <form onSubmit={handleAddTask}>
          <div>
            <label htmlFor="newTaskTitle">Tytuł: </label>
            <input
              type="text"
              id="newTaskTitle"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              required
              style={{ minWidth: "300px", marginBottom: "10px" }}
            />
          </div>
          <div>
            <label htmlFor="newTaskDescription">Opis: </label>
            <textarea
              id="newTaskDescription"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              style={{
                minWidth: "300px",
                minHeight: "60px",
                marginBottom: "10px",
              }}
            />
          </div>
          <button type="submit" disabled={isAddingTask}>
            {isAddingTask ? "Dodawanie..." : "Dodaj Zadanie"}
          </button>
        </form>
      </div>

      {apiError && (
        <div style={{ marginTop: "20px", color: "red" }}>
          <h2>Błąd:</h2>
          <pre>{apiError}</pre>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <h2>Twoje Zadania</h2>
        {isLoadingTasks && <p>Ładowanie zadań...</p>}
        {!isLoadingTasks && tasks.length > 0 ? (
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong> (Status: {task.status}, Priorytet:{" "}
                {task.priority}){task.description && <p>{task.description}</p>}
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
          !isLoadingTasks && (
            <p>
              Nie masz jeszcze żadnych zadań lub nie udało się ich załadować.
            </p>
          )
        )}
      </div>
    </div>
  );
}
