/*
  Warnings:

  - A unique constraint covering the columns `[name,userId]` on the table `RawMaterial` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `RawMaterial` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RawMaterial_name_key";

-- AlterTable
ALTER TABLE "RawMaterial" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterial_name_userId_key" ON "RawMaterial"("name", "userId");

-- AddForeignKey
ALTER TABLE "RawMaterial" ADD CONSTRAINT "RawMaterial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
