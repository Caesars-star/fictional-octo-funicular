import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddProductDialog } from "@/components/catalog/add-product-dialog";
import { QuickAddCategoryForm, QuickAddUnitForm } from "@/components/catalog/quick-add-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Material catalog" };

export default async function CatalogPage() {
  const [categories, units, products] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      include: { category: true, defaultUnit: true, supplierProducts: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material catalog"
        description="Reusable products, categories and units shared across every project's BOQ and RFQs."
        actions={<AddProductDialog categories={categories} units={units} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAddCategoryForm />
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c.id} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {c.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Units</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAddUnitForm />
            <div className="flex flex-wrap gap-2">
              {units.map((u) => (
                <span key={u.id} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {u.name} ({u.abbreviation})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="Add the materials suppliers can quote on, like cement, steel or timber."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Suppliers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category.name}</TableCell>
                    <TableCell>{p.defaultUnit.abbreviation}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                    <TableCell className="text-right">{p.supplierProducts.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
