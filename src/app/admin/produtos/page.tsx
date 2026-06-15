import Image from "next/image";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { deleteProduct, upsertProduct } from "@/lib/actions/admin";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, inventory: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-4xl font-black">Produtos</h1>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="surface overflow-hidden">
          <div className="grid gap-2 p-5">
            {products.map((product) => (
              <div key={product.id} className="grid gap-4 border-b border-[var(--line)] py-4 md:grid-cols-[80px_1fr_auto]">
                <div className="relative aspect-square overflow-hidden rounded-md bg-[#f0efed]">
                  {product.images[0] && <Image src={product.images[0].url} alt={product.name} fill sizes="80px" className="object-cover" />}
                </div>
                <div>
                  <strong>{product.name}</strong>
                  <p className="text-sm text-[var(--muted)]">{product.category.name} · {product.sku}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Estoque total: {product.inventory.reduce((sum, item) => sum + item.quantity, 0)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <strong>{formatCurrency(product.price)}</strong>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <button className="btn btn-secondary px-3 text-red-700">Arquivar</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
        <form action={upsertProduct} className="surface grid gap-3 self-start p-5">
          <h2 className="text-xl font-black">Cadastrar produto</h2>
          <select className="field" name="categoryId" required>
            <option value="">Categoria</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input className="field" name="name" placeholder="Nome" required />
          <input className="field" name="sku" placeholder="SKU" required />
          <input className="field" name="shortDescription" placeholder="Descrição curta" required />
          <textarea className="field min-h-28" name="description" placeholder="Descrição completa" required />
          <input className="field" name="price" type="number" step="0.01" placeholder="Preço" required />
          <input className="field" name="compareAtPrice" type="number" step="0.01" placeholder="Preço de comparação" />
          <input className="field" name="stock" type="number" placeholder="Estoque inicial" required />
          <ImageUploadField name="imageUrl" placeholder="URL Cloudinary/Imagem" required />
          <label className="flex items-center gap-2 text-sm font-bold"><input name="featured" type="checkbox" /> Destaque</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input name="bestSeller" type="checkbox" /> Mais vendido</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input name="promotion" type="checkbox" /> Promoção</label>
          <button className="btn btn-primary">Salvar produto</button>
        </form>
      </div>
    </div>
  );
}
