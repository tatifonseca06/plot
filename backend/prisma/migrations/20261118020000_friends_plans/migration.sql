-- CreateEnum
CREATE TYPE "PlanVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "visibility" "PlanVisibility" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "experienceId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Room_experienceId_key" ON "Room"("experienceId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve visibility of pre-existing catalog experiences; new plans default private.
UPDATE "Experience" SET "visibility" = 'PUBLIC';
-- Pending submissions no longer need approval. Existing drafts stay drafts.
UPDATE "Experience" SET "status" = 'PUBLISHED' WHERE "status" = 'PENDING';
INSERT INTO "Category" ("name") VALUES ('Entre amigos') ON CONFLICT DO NOTHING;
INSERT INTO "Subcategory" ("id", "name", "categoryName") VALUES ('10000000-0000-4000-8000-000000000010', 'Plan libre', 'Entre amigos') ON CONFLICT DO NOTHING;
