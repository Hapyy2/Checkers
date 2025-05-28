print("Start MongoDB initialization");
db = db.getSiblingDB("tododb");

var passwordFile = "/run/secrets/mongo_password";
var password = "";

try {
  password = fs.readFileSync(passwordFile, "utf8");
  password = password.trim();
  print("Password for todoapp read successfully from secret.");
} catch (e) {
  print("Error reading password file for todoapp: " + e);
}

if (password) {
  try {
    var userExists = db.getUser("todoapp");
    if (!userExists) {
      db.createUser({
        user: "todoapp",
        pwd: password,
        roles: [{ role: "readWrite", db: "tododb" }],
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

print("Creating collections and indexes for ToDo application...");

db.createCollection("taskDetails");
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

db.createCollection("errorlogs");

db.errorlogs.createIndex({ timestamp: -1 });
print("Created 'timestamp' index for 'errorlogs'.");

db.errorlogs.createIndex({ sourceService: 1 });
print("Created 'sourceService' index for 'errorlogs'.");

db.errorlogs.createIndex({ errorCode: 1 });
print("Created 'errorCode' index for 'errorlogs'.");

db.errorlogs.createIndex({ "requestDetails.userId": 1 }, { sparse: true });
print("Created 'requestDetails.userId' (sparse) index for 'errorlogs'.");

db.errorlogs.createIndex({ loggedAt: -1 });
print("Created 'loggedAt' index for 'errorlogs'.");

db.errorlogs.createIndex({ loggedAt: 1 }, { expireAfterSeconds: 7776000 });
print(
  "Created TTL index for 'errorlogs' (auto-cleanup after 90 days based on 'loggedAt')."
);

db.errorlogs.createIndex(
  {
    errorMessage: "text",
    stackTrace: "text",
  },
  {
    default_language: "none",
    name: "error_text_search_index",
  }
);
print(
  "Created text search index for 'errorMessage' and 'stackTrace' in 'errorlogs'."
);

print("MongoDB initialization script completed for 'tododb'.");
