-- CreateTable
CREATE TABLE "Commenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "name" TEXT,
    "linkedinUrl" TEXT NOT NULL,
    "title" TEXT,
    "avatarUrl" TEXT,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Commenter_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Commenter_postId_linkedinUrl_key" ON "Commenter"("postId", "linkedinUrl");
