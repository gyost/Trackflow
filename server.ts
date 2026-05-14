import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// SQLite Implementation
const db = new Database("syncplan.db");
db.pragma("journal_mode = WAL");

// Helper to run migrations
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT,
      status TEXT,
      source TEXT,
      assigneeId TEXT,
      submitterId TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS requirement_history (
      id TEXT PRIMARY KEY,
      requirementId TEXT,
      status TEXT,
      timestamp TEXT,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      title TEXT NOT NULL,
      level TEXT,
      parentId TEXT,
      startDate TEXT,
      endDate TEXT,
      status TEXT,
      progress TEXT,
      metric TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      planId TEXT,
      title TEXT NOT NULL,
      assigneeId TEXT,
      status TEXT,
      priority TEXT,
      progress TEXT,
      endDate TEXT
    );

    CREATE TABLE IF NOT EXISTS outcomes (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      title TEXT NOT NULL,
      description TEXT,
      submitterId TEXT,
      date TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS release_goals (
      id TEXT PRIMARY KEY,
      groupId TEXT,
      title TEXT NOT NULL,
      targetMonth TEXT,
      targetDate TEXT,
      actualVersion TEXT,
      actualReleaseDate TEXT,
      status TEXT,
      note TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS project_trackings (
      id TEXT PRIMARY KEY,
      customerName TEXT NOT NULL,
      status TEXT,
      product TEXT,
      cityManager TEXT,
      projectManager TEXT,
      expectedContractAmount REAL,
      actualContractAmount REAL,
      contactName TEXT,
      contactPhone TEXT,
      lastFollowupDate TEXT,
      updatedAt TEXT
    );
  `);

  
  // Migration check for missing columns
  const tableInfo = db.prepare("PRAGMA table_info(requirements)").all() as any[];
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes('source')) db.exec("ALTER TABLE requirements ADD COLUMN source TEXT");
  if (!columns.includes('assigneeId')) db.exec("ALTER TABLE requirements ADD COLUMN assigneeId TEXT");
  if (!columns.includes('updatedAt')) db.exec("ALTER TABLE requirements ADD COLUMN updatedAt TEXT");
  if (!columns.includes('deleted')) db.exec("ALTER TABLE requirements ADD COLUMN deleted INTEGER DEFAULT 0");
  if (!columns.includes('deletedAt')) db.exec("ALTER TABLE requirements ADD COLUMN deletedAt TEXT");
  if (!columns.includes('customerName')) db.exec("ALTER TABLE requirements ADD COLUMN customerName TEXT");
  if (!columns.includes('internalSourceDetail')) db.exec("ALTER TABLE requirements ADD COLUMN internalSourceDetail TEXT");
  
  const projectsTableInfo = db.prepare("PRAGMA table_info(projects)").all() as any[];
  const projectColumns = projectsTableInfo.map(c => c.name);
  if (!projectColumns.includes('category')) db.exec("ALTER TABLE projects ADD COLUMN category TEXT");

  console.log("SQLite database initialized and synced.");
}

migrate();

// API Routes
app.get("/api/requirements", (req, res) => {
  try {
    const requirements = db.prepare("SELECT * FROM requirements ORDER BY createdAt DESC").all() as any[];
    
    for (let reqItem of requirements) {
      reqItem.deleted = reqItem.deleted === 1;
      reqItem.history = db.prepare("SELECT * FROM requirement_history WHERE requirementId = ? ORDER BY timestamp DESC").all(reqItem.id);
    }
    
    res.json(requirements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/requirements", (req, res) => {
  try {
    const reqData = req.body;
    
    const upsertReq = db.prepare(`
      INSERT INTO requirements (id, projectId, title, description, priority, status, source, submitterId, assigneeId, createdAt, updatedAt, deleted, deletedAt, customerName, internalSourceDetail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        priority = excluded.priority,
        status = excluded.status,
        source = excluded.source,
        assigneeId = excluded.assigneeId,
        updatedAt = excluded.updatedAt,
        deleted = excluded.deleted,
        deletedAt = excluded.deletedAt,
        customerName = excluded.customerName,
        internalSourceDetail = excluded.internalSourceDetail
    `);

    upsertReq.run(
      reqData.id, 
      reqData.projectId, 
      reqData.title, 
      reqData.description, 
      reqData.priority, 
      reqData.status, 
      reqData.source, 
      reqData.submitterId, 
      reqData.assigneeId || null, 
      reqData.createdAt, 
      reqData.updatedAt,
      reqData.deleted ? 1 : 0,
      reqData.deletedAt || null,
      reqData.customerName || null,
      reqData.internalSourceDetail || null
    );

    if (reqData.newHistoryEntry) {
      const entry = reqData.newHistoryEntry;
      db.prepare(`
        INSERT INTO requirement_history (id, requirementId, status, timestamp, note)
        VALUES (?, ?, ?, ?, ?)
      `).run(entry.id, reqData.id, entry.status, entry.timestamp, entry.note || "");
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Save requirement error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/requirements/:id/history", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM requirement_history WHERE requirementId = ? ORDER BY timestamp DESC").all(req.params.id);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/requirements/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM requirements WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/projects", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM projects").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/projects", (req, res) => {
  try {
    const project = req.body;
    db.prepare(`
      INSERT INTO projects (id, title, description, category)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        category = excluded.category
    `).run(project.id, project.title, project.description, project.category);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/plans", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM plans").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/plans", (req, res) => {
  try {
    const plan = req.body;
    db.prepare(`
      INSERT INTO plans (id, projectId, title, level, parentId, startDate, endDate, status, progress, metric)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        level = excluded.level,
        parentId = excluded.parentId,
        startDate = excluded.startDate,
        endDate = excluded.endDate,
        status = excluded.status,
        progress = excluded.progress,
        metric = excluded.metric
    `).run(
      plan.id, plan.projectId, plan.title, plan.level, plan.parentId, plan.startDate, plan.endDate, plan.status, plan.progress, JSON.stringify(plan.metric)
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tasks", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM tasks").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    const task = req.body;
    db.prepare(`
      INSERT INTO tasks (id, projectId, planId, title, assigneeId, status, priority, progress, endDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        progress = excluded.progress,
        endDate = excluded.endDate
    `).run(
      task.id, task.projectId, task.planId, task.title, task.assigneeId, task.status, task.priority, task.progress, task.endDate
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/outcomes", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM outcomes").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/outcomes", (req, res) => {
  try {
    const outcome = req.body;
    db.prepare(`
      INSERT INTO outcomes (id, projectId, title, description, submitterId, date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        status = excluded.status
    `).run(
      outcome.id, outcome.projectId, outcome.title, outcome.description, outcome.submitterId, outcome.date, outcome.status
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/releaseGoals", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM release_goals").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/releaseGoals", (req, res) => {
  try {
    const goal = req.body;
    db.prepare(`
      INSERT INTO release_goals (id, groupId, title, targetMonth, targetDate, actualVersion, actualReleaseDate, status, note, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        targetMonth = excluded.targetMonth,
        targetDate = excluded.targetDate,
        actualVersion = excluded.actualVersion,
        actualReleaseDate = excluded.actualReleaseDate,
        status = excluded.status,
        note = excluded.note
    `).run(
      goal.id, goal.groupId, goal.title, goal.targetMonth, goal.targetDate, goal.actualVersion || null, goal.actualReleaseDate || null, goal.status, goal.note || null, goal.createdAt
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/releaseGoals/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM release_goals WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/projectTrackings", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM project_trackings ORDER BY updatedAt DESC").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/projectTrackings", (req, res) => {
  try {
    const track = req.body;
    db.prepare(`
      INSERT INTO project_trackings (id, customerName, status, product, cityManager, projectManager, expectedContractAmount, actualContractAmount, contactName, contactPhone, lastFollowupDate, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        customerName = excluded.customerName,
        status = excluded.status,
        product = excluded.product,
        cityManager = excluded.cityManager,
        projectManager = excluded.projectManager,
        expectedContractAmount = excluded.expectedContractAmount,
        actualContractAmount = excluded.actualContractAmount,
        contactName = excluded.contactName,
        contactPhone = excluded.contactPhone,
        lastFollowupDate = excluded.lastFollowupDate,
        updatedAt = excluded.updatedAt
    `).run(
      track.id, track.customerName, track.status, track.product, track.cityManager, track.projectManager, track.expectedContractAmount, track.actualContractAmount, track.contactName, track.contactPhone, track.lastFollowupDate, track.updatedAt
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/projectTrackings/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM project_trackings WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
