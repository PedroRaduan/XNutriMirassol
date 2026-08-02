ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'PAGBANK';

ALTER TABLE "financial_settings"
  RENAME COLUMN "mercadoPagoRate" TO "pagBankRate";

ALTER TABLE "financial_settings"
  RENAME COLUMN "posMercadoPagoRate" TO "posPagBankRate";
