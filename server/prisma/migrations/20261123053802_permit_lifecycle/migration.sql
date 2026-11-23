-- DropForeignKey
ALTER TABLE "Approval" DROP CONSTRAINT "Approval_approverId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- AlterTable
ALTER TABLE "Approval" ADD COLUMN     "requiredRole" "Role" NOT NULL DEFAULT 'AREA_OWNER',
ALTER COLUMN "approverId" DROP NOT NULL;

-- Backfill approval requirements from the users who decided existing approvals.
UPDATE "Approval" AS a
SET "requiredRole" = u."role"
FROM "User" AS u
WHERE a."approverId" = u."id";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "systemAction" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "actorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Permit" ADD COLUMN     "validUntil" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "PermitNumberSeq" AS bigint START 1;

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkLog_permitId_createdAt_idx" ON "WorkLog"("permitId", "createdAt");

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
