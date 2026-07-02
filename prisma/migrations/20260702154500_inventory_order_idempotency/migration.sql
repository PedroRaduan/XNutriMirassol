-- Prevent duplicated stock-out or return movements when payment webhooks are retried concurrently.
CREATE UNIQUE INDEX "inventory_movements_inventoryId_orderId_type_key"
ON "inventory_movements"("inventoryId", "orderId", "type");
