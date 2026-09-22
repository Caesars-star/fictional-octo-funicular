import { prisma } from "@/lib/prisma";
import { sumDecimal } from "@/lib/money";
import { FULFILLING_DELIVERY_STATUSES } from "@/lib/validations/delivery";

/**
 * Recomputes a purchase order's fulfilment status from its deliveries.
 * Called after any delivery status change. Only ever moves a PO *forward*
 * (ACCEPTED -> PARTIALLY_DELIVERED -> COMPLETED) — never reverts it
 * automatically, and never touches a PO that isn't already ACCEPTED or
 * PARTIALLY_DELIVERED (a DRAFT/ISSUED PO hasn't been accepted by the
 * supplier yet; COMPLETED/CANCELLED are terminal).
 */
export async function recomputePurchaseOrderDeliveryStatus(purchaseOrderId: string): Promise<void> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      items: {
        include: {
          deliveryItems: { include: { delivery: { select: { status: true } } } },
        },
      },
    },
  });
  if (!po) return;
  if (po.status !== "ACCEPTED" && po.status !== "PARTIALLY_DELIVERED") return;

  let allComplete = true;
  let anyDelivered = false;

  for (const item of po.items) {
    const deliveredQty = sumDecimal(
      item.deliveryItems
        .filter((di) => FULFILLING_DELIVERY_STATUSES.includes(di.delivery.status))
        .map((di) => di.quantity),
    );
    if (deliveredQty.greaterThan(0)) anyDelivered = true;
    if (deliveredQty.lessThan(item.quantity)) allComplete = false;
  }

  const nextStatus = allComplete ? "COMPLETED" : anyDelivered ? "PARTIALLY_DELIVERED" : null;
  if (nextStatus && nextStatus !== po.status) {
    await prisma.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: nextStatus } });
  }
}
