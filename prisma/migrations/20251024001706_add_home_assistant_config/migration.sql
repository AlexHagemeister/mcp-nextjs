-- CreateTable
CREATE TABLE "HomeAssistantConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "haUrl" TEXT NOT NULL,
    "haToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeAssistantConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeAssistantConfig_userId_key" ON "HomeAssistantConfig"("userId");

-- AddForeignKey
ALTER TABLE "HomeAssistantConfig" ADD CONSTRAINT "HomeAssistantConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
