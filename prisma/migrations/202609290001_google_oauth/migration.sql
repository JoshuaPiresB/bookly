-- Contas criadas por OAuth não possuem uma senha local até solicitarem uma redefinição.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- O identificador `sub` do Google é estável e impede que duas contas Bookly
-- sejam associadas à mesma identidade do provedor.
ALTER TABLE "User" ADD COLUMN "googleId" VARCHAR(255);
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
