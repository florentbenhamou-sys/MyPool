import { ProductsView } from "@/components/catalog/products-view";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { listProducts } from "@/server/data/catalog";

export const metadata = { title: t.catalog.products };

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <>
      <PageHeader title={t.catalog.products} />
      <ProductsView
        products={products.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description,
          active: p.active,
          usageCount: p._count.proposalProducts,
        }))}
      />
    </>
  );
}
