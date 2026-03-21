-- CreateTable
CREATE TABLE "RecessAddItemIdempotency" (
    "id" TEXT NOT NULL,
    "recessSessionId" TEXT NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecessAddItemIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecessAddItemIdempotency_recessSessionId_key_key" ON "RecessAddItemIdempotency"("recessSessionId", "key");

-- CreateIndex
CREATE INDEX "RecessAddItemIdempotency_recessSessionId_idx" ON "RecessAddItemIdempotency"("recessSessionId");

-- AddForeignKey
ALTER TABLE "RecessAddItemIdempotency" ADD CONSTRAINT "RecessAddItemIdempotency_recessSessionId_fkey" FOREIGN KEY ("recessSessionId") REFERENCES "RecessSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
