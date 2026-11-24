ALTER TABLE "Permit" ADD COLUMN "completionNotes" TEXT;
ALTER TABLE "Permit" ADD COLUMN "verificationAreaClean" BOOLEAN;
ALTER TABLE "Permit" ADD COLUMN "verificationComment" TEXT;
ALTER TABLE "Permit" ADD COLUMN "verifiedById" TEXT;
ALTER TABLE "Permit" ADD COLUMN "verifiedAt" TIMESTAMP(3);

ALTER TABLE "Permit" ADD CONSTRAINT "Permit_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Permit_verifiedById_idx" ON "Permit"("verifiedById");
