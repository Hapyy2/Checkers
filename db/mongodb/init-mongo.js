print("Start MongoDB initialization");
db = db.getSiblingDB("tododb"); // Upewnij się, że to jest docelowa baza danych

var passwordFile = "/run/secrets/mongo_password"; // Ścieżka do sekretu z hasłem
var password = "";

try {
  // Odczyt hasła z pliku sekretu
  // Uwaga: fs.readFileSync może nie być dostępne we wszystkich wersjach/środowiskach mongo shell.
  // Jeśli to nie działa, można użyć `cat(passwordFile).trim()` lub podobnej metody.
  // Zakładamy, że ta część działa w Twoim środowisku mongo:7.0.
  password = fs.readFileSync(passwordFile, "utf8");
  password = password.trim();
  print("Password for todoapp read successfully from secret.");
} catch (e) {
  print("Error reading password file for todoapp: " + e);
  // Rozważ zakończenie skryptu lub nie tworzenie użytkownika, jeśli hasła nie można odczytać
}

if (password) {
  try {
    // Sprawdzenie, czy użytkownik już istnieje, aby uniknąć błędu przy ponownym uruchomieniu
    var userExists = db.getUser("todoapp");
    if (!userExists) {
      db.createUser({
        user: "todoapp",
        pwd: password,
        roles: [{ role: "readWrite", db: "tododb" }], // Uprawnienia do bazy tododb
      });
      print("User 'todoapp' created successfully in 'tododb' database.");
    } else {
      print("User 'todoapp' already exists in 'tododb' database.");
    }
  } catch (e) {
    print("Error creating 'todoapp' user: " + e);
  }
} else {
  print(
    "Password not found or empty in the secret file. User 'todoapp' not created."
  );
}

// Tworzenie indeksów dla istniejących kolekcji (pozostaje bez zmian)
print("Creating collections and indexes for ToDo application...");

db.createCollection("taskDetails"); // Jawne tworzenie kolekcji jest dobre, ale nie zawsze konieczne przed createIndex
db.taskDetails.createIndex({ task_id: 1 }, { unique: true });
db.taskDetails.createIndex({ location: "2dsphere" });
db.taskDetails.createIndex({ "comments.created_at": 1 });
print("Indexes for 'taskDetails' created.");

db.createCollection("activityLogs");
db.activityLogs.createIndex({ user_id: 1, created_at: -1 });
db.activityLogs.createIndex({ entity_type: 1, entity_id: 1 });
print("Indexes for 'activityLogs' created.");

db.createCollection("notifications");
db.notifications.createIndex({ user_id: 1, is_read: 1, created_at: -1 });
print("Indexes for 'notifications' created.");

db.createCollection("reports");
db.reports.createIndex({ creator_id: 1 });
db.reports.createIndex({ "access.user_id": 1 });
db.reports.createIndex({ is_scheduled: 1, "schedule.next_run": 1 });
print("Indexes for 'reports' created.");

// ========== Konfiguracja kolekcji i indeksów dla Error Service (errorlogs) ==========
print("Creating 'errorlogs' collection and indexes for Error Service...");

// Jawne utworzenie kolekcji 'errorlogs' (Mongoose zrobi to automatycznie, ale to nie szkodzi)
db.createCollection("errorlogs");

// Indeks dla sortowania po `timestamp` (czas wystąpienia błędu), najnowsze pierwsze.
// Używany do pobierania błędów w kolejności chronologicznej.
db.errorlogs.createIndex({ timestamp: -1 });
print("Created 'timestamp' index for 'errorlogs'.");

// Indeks dla filtrowania po `sourceService`.
// Kluczowy dla zapytań typu GET /api/errors?sourceService=...
db.errorlogs.createIndex({ sourceService: 1 });
print("Created 'sourceService' index for 'errorlogs'.");

// Indeks dla filtrowania po `errorCode`.
db.errorlogs.createIndex({ errorCode: 1 });
print("Created 'errorCode' index for 'errorlogs'.");

// Indeks dla filtrowania po `requestDetails.userId` (jeśli często wyszukujesz błędy konkretnego użytkownika).
// Opcjonalny, dodaj jeśli potrzebne.
db.errorlogs.createIndex({ "requestDetails.userId": 1 }, { sparse: true }); // sparse: true, jeśli pole może nie istnieć
print("Created 'requestDetails.userId' (sparse) index for 'errorlogs'.");

// Indeks dla sortowania po `loggedAt` (czas zapisu logu w error-service).
// Może być używany jako alternatywa dla sortowania lub do TTL.
db.errorlogs.createIndex({ loggedAt: -1 });
print("Created 'loggedAt' index for 'errorlogs'.");

// Indeks TTL (Time To Live) - automatyczne usuwanie starych błędów po 90 dniach.
// Używa pola `loggedAt` do określenia "wieku" dokumentu.
db.errorlogs.createIndex(
  { loggedAt: 1 }, // Musi być sortowanie ASC dla TTL
  { expireAfterSeconds: 7776000 } // 90 dni = 90 * 24 * 60 * 60 sekund
);
print(
  "Created TTL index for 'errorlogs' (auto-cleanup after 90 days based on 'loggedAt')."
);

// Indeks tekstowy do wyszukiwania pełnotekstowego w komunikatach błędów i stack trace.
// Umożliwia wyszukiwanie np. fragmentów tekstu w błędach.
db.errorlogs.createIndex(
  {
    errorMessage: "text",
    stackTrace: "text",
  },
  {
    default_language: "none", // Ustaw 'english' lub inny język, jeśli błędy są głównie w jednym języku
    name: "error_text_search_index", // Opcjonalna nazwa indeksu
  }
);
print(
  "Created text search index for 'errorMessage' and 'stackTrace' in 'errorlogs'."
);

print("MongoDB initialization script completed for 'tododb'.");
