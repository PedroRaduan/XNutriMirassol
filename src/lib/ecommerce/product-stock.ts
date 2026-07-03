export type ProductInventorySummary = {
  inventory?: Array<{ quantity: number; reserved: number }>;
};

export function getProductAvailableStock(product: ProductInventorySummary) {
  return Math.max(
    product.inventory?.reduce(
      (total, item) => total + Math.max(item.quantity - item.reserved, 0),
      0,
    ) ?? 0,
    0,
  );
}

export function hasProductAvailableStock(product: ProductInventorySummary) {
  return getProductAvailableStock(product) > 0;
}

export function availableProductsFirst<T extends ProductInventorySummary>(products: T[]) {
  return products
    .map((product, originalIndex) => ({
      product,
      originalIndex,
      available: hasProductAvailableStock(product),
    }))
    .sort((left, right) => {
      if (left.available !== right.available) return left.available ? -1 : 1;
      return left.originalIndex - right.originalIndex;
    })
    .map(({ product }) => product);
}
