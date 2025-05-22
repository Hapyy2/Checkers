print("Start MongoDB initialization");
db = db.getSiblingDB("tododb");

var passwordFile = "/run/secrets/mongo_password";
var password = "";

try {
  password = fs.readFileSync(passwordFile, "utf8");
  password = password.trim();
  print("Hasło odczytane pomyślnie");
} catch (e) {
  print("Error reading password file: " + e);
}

if (password) {
  try {
    db.createUser({
      user: "todoapp",
      pwd: password,
      roles: [{ role: "readWrite", db: "tododb" }],
    });
    print("todoapp user created successfully");
  } catch (e) {
    print("Error creating todoapp user: " + e);
  }
} else {
  print("Password not found in the secret file.");
}

// Creating indexes for collections (as in the original script)
db.createCollection("taskDetails");
db.taskDetails.createIndex({ task_id: 1 }, { unique: true });
db.taskDetails.createIndex({ location: "2dsphere" });
db.taskDetails.createIndex({ "comments.created_at": 1 });

db.createCollection("activityLogs");
db.activityLogs.createIndex({ user_id: 1, created_at: -1 });
db.activityLogs.createIndex({ entity_type: 1, entity_id: 1 });

db.createCollection("notifications");
db.notifications.createIndex({ user_id: 1, is_read: 1, created_at: -1 });

db.createCollection("reports");
db.reports.createIndex({ creator_id: 1 });
db.reports.createIndex({ "access.user_id": 1 });
db.reports.createIndex({ is_scheduled: 1, "schedule.next_run": 1 });

// ========== ERROR REPORTER COLLECTIONS ==========
print("Creating Error Reporter collections and indexes...");

// Creating errors collection
db.createCollection("errors");

// Indeks dla sortowania po czasie (najnowsze pierwsze)
db.errors.createIndex({ timestamp: -1 });
print("Created timestamp index for errors");

// Indeks kompozytowy dla filtrowania po serwisie i poziomie
db.errors.createIndex({ service: 1, level: 1 });
print("Created service-level composite index for errors");

// Indeks dla wyszukiwania błędów użytkownika
db.errors.createIndex({ "user.id": 1 });
print("Created user.id index for errors");

// Indeks dla filtrowania po środowisku
db.errors.createIndex({ environment: 1 });
print("Created environment index for errors");

// Indeks dla kodu błędu
db.errors.createIndex({ "error.code": 1 });
print("Created error.code index for errors");

// Indeks kompozytowy dla statystyk (serwis, poziom, nazwa błędu)
db.errors.createIndex({
  service: 1,
  level: 1,
  "error.name": 1,
});
print("Created statistics composite index for errors");

// Indeks TTL (Time To Live) - automatyczne usuwanie starych błędów po 90 dniach
db.errors.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 } // 90 dni = 90 * 24 * 60 * 60 sekund
);
print("Created TTL index for automatic cleanup after 90 days");

// Indeks tekstowy do wyszukiwania w treści błędów
db.errors.createIndex({
  "error.message": "text",
  "error.stack": "text",
});
print("Created text index for error search");

print("MongoDB initialization completed");
