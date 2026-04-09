const { createClient } = require("@libsql/client");

const DB_URL = "libsql://gtm-linkedin-tushar4654.aws-ap-south-1.turso.io";
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error("Please provide the Turso Token as an argument.");
  process.exit(1);
}

const client = createClient({ url: DB_URL, authToken: TOKEN });

const sql = `
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "title" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_url_key" ON "Profile"("url");

CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "postedAt" DATETIME,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Post_postUrl_key" ON "Post"("postUrl");

CREATE TABLE IF NOT EXISTS "Commenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "name" TEXT,
    "linkedinUrl" TEXT NOT NULL,
    "title" TEXT,
    "avatarUrl" TEXT,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Commenter_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Commenter_postId_linkedinUrl_key" ON "Commenter"("postId", "linkedinUrl");

CREATE TABLE IF NOT EXISTS "Interest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Interest_keyword_key" ON "Interest"("keyword");

CREATE TABLE IF NOT EXISTS "SyncJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "posts" INTEGER NOT NULL DEFAULT 0,
    "commenters" INTEGER NOT NULL DEFAULT 0,
    "log" TEXT NOT NULL DEFAULT '[]',
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

async function main() {
  console.log("Pushing tables to Turso...");
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
  console.log("Successfully created all tables!");
}
main().catch(console.error);
