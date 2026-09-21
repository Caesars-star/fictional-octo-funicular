/**
 * Demo/development seed data for TARA. Every organization, person and
 * transaction here is fictional and exists only to exercise the
 * PROJECT → BOQ → RFQ → QUOTATION → COMPARISON workflow end-to-end.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { recomputePurchaseOrderDeliveryStatus } from "../src/lib/purchase-orders";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "TaraDemo2026!";
const BCRYPT_COST_FACTOR = 12;

function money(value: number) {
  return new Prisma.Decimal(value);
}

async function hashDemoPassword() {
  return bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST_FACTOR);
}

async function main() {
  const passwordHash = await hashDemoPassword();

  // ---------------------------------------------------------------------
  // Catalog: units, categories, products
  // ---------------------------------------------------------------------
  const unitDefs = [
    { name: "Bag", abbreviation: "bag" },
    { name: "Tonne", abbreviation: "t" },
    { name: "Cubic metre", abbreviation: "m3" },
    { name: "Piece", abbreviation: "pc" },
    { name: "Litre", abbreviation: "L" },
    { name: "Metre", abbreviation: "m" },
  ];
  const units = Object.fromEntries(
    await Promise.all(
      unitDefs.map(async (u) => [
        u.abbreviation,
        await prisma.unit.upsert({ where: { abbreviation: u.abbreviation }, create: u, update: {} }),
      ]),
    ),
  );

  const categoryDefs = [
    "Cement",
    "Steel & Reinforcement",
    "Blocks & Masonry",
    "Aggregates",
    "Timber",
    "Roofing",
    "Paint & Finishes",
    "Electrical",
    "Plumbing",
  ];
  const categories = Object.fromEntries(
    await Promise.all(
      categoryDefs.map(async (name) => [
        name,
        await prisma.productCategory.upsert({ where: { name }, create: { name }, update: {} }),
      ]),
    ),
  );

  async function upsertProduct(name: string, categoryName: string, unitAbbr: string) {
    const existing = await prisma.product.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.product.create({
      data: {
        name,
        categoryId: categories[categoryName].id,
        defaultUnitId: units[unitAbbr].id,
      },
    });
  }

  const cement = await upsertProduct("Portland Cement 50kg", "Cement", "bag");
  const steelY12 = await upsertProduct("Reinforcement Steel Y12", "Steel & Reinforcement", "t");
  const steelY16 = await upsertProduct("Reinforcement Steel Y16", "Steel & Reinforcement", "t");
  const ballast = await upsertProduct("Ballast", "Aggregates", "m3");
  const sand = await upsertProduct("River Sand", "Aggregates", "m3");
  const blocks = await upsertProduct('Concrete Blocks 6"', "Blocks & Masonry", "pc");
  const roofingSheets = await upsertProduct("Roofing Sheets (Gauge 28)", "Roofing", "pc");
  const paint = await upsertProduct("Exterior Emulsion Paint", "Paint & Finishes", "L");
  await upsertProduct("Timber 4x2", "Timber", "m");
  await upsertProduct("Electrical Cable 2.5mm", "Electrical", "m");
  await upsertProduct("PVC Pipe 4-inch", "Plumbing", "m");

  // ---------------------------------------------------------------------
  // Organizations, suppliers, contractors, users
  // ---------------------------------------------------------------------
  async function upsertOrgWithUser(params: {
    orgName: string;
    orgType: "DEVELOPER" | "SUPPLIER" | "CONTRACTOR" | "PLATFORM";
    email: string;
    firstName: string;
    lastName: string;
    role:
      | "PLATFORM_ADMIN"
      | "DEVELOPER"
      | "PROJECT_MANAGER"
      | "SUPPLIER"
      | "CONTRACTOR";
  }) {
    const org = await prisma.organization.upsert({
      where: { id: (await prisma.organization.findFirst({ where: { name: params.orgName } }))?.id ?? "__none__" },
      create: { name: params.orgName, type: params.orgType, verificationStatus: "VERIFIED" },
      update: {},
    });

    const user = await prisma.user.upsert({
      where: { email: params.email },
      create: {
        email: params.email,
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        role: params.role,
      },
      update: {},
    });

    await prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      create: { organizationId: org.id, userId: user.id, role: "OWNER" },
      update: {},
    });

    return { org, user };
  }

  const { org: developerOrg, user: developerUser } = await upsertOrgWithUser({
    orgName: "TARA Demo Development Ltd",
    orgType: "DEVELOPER",
    email: "developer@tara.dev",
    firstName: "Wanjiru",
    lastName: "Kamau",
    role: "DEVELOPER",
  });

  const pmUser = await prisma.user.upsert({
    where: { email: "pm@tara.dev" },
    create: {
      email: "pm@tara.dev",
      passwordHash,
      firstName: "Otieno",
      lastName: "Odhiambo",
      role: "PROJECT_MANAGER",
    },
    update: {},
  });
  await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: developerOrg.id, userId: pmUser.id } },
    create: { organizationId: developerOrg.id, userId: pmUser.id, role: "MEMBER" },
    update: {},
  });

  const { org: cementOrg, user: cementUser } = await upsertOrgWithUser({
    orgName: "Rift Valley Cement Suppliers Ltd",
    orgType: "SUPPLIER",
    email: "supplier-cement@tara.dev",
    firstName: "Kiplangat",
    lastName: "Rotich",
    role: "SUPPLIER",
  });
  const cementSupplier = await prisma.supplier.upsert({
    where: { organizationId: cementOrg.id },
    create: {
      organizationId: cementOrg.id,
      contactName: cementUser.firstName + " " + cementUser.lastName,
      contactEmail: cementUser.email,
      location: "Nakuru, Kenya",
      serviceArea: "Central & Rift Valley",
      verificationStatus: "VERIFIED",
    },
    update: {},
  });

  const { org: hardwareOrg, user: hardwareUser } = await upsertOrgWithUser({
    orgName: "Jenga Hardware & Steel Supplies",
    orgType: "SUPPLIER",
    email: "supplier-hardware@tara.dev",
    firstName: "Amina",
    lastName: "Hassan",
    role: "SUPPLIER",
  });
  const hardwareSupplier = await prisma.supplier.upsert({
    where: { organizationId: hardwareOrg.id },
    create: {
      organizationId: hardwareOrg.id,
      contactName: hardwareUser.firstName + " " + hardwareUser.lastName,
      contactEmail: hardwareUser.email,
      location: "Thika, Kenya",
      serviceArea: "Kiambu County",
      verificationStatus: "VERIFIED",
    },
    update: {},
  });

  const { org: electricalOrg } = await upsertOrgWithUser({
    orgName: "SparkTech Electrical Supplies",
    orgType: "SUPPLIER",
    email: "supplier-electrical@tara.dev",
    firstName: "Brian",
    lastName: "Mwangi",
    role: "SUPPLIER",
  });
  await prisma.supplier.upsert({
    where: { organizationId: electricalOrg.id },
    create: { organizationId: electricalOrg.id, location: "Nairobi, Kenya", verificationStatus: "VERIFIED" },
    update: {},
  });

  const { org: plumbingOrg } = await upsertOrgWithUser({
    orgName: "FlowWorks Plumbing Supplies",
    orgType: "SUPPLIER",
    email: "supplier-plumbing@tara.dev",
    firstName: "Grace",
    lastName: "Njeri",
    role: "SUPPLIER",
  });
  await prisma.supplier.upsert({
    where: { organizationId: plumbingOrg.id },
    create: { organizationId: plumbingOrg.id, location: "Nairobi, Kenya", verificationStatus: "VERIFIED" },
    update: {},
  });

  const { org: generalContractorOrg } = await upsertOrgWithUser({
    orgName: "BuildRight General Contractors",
    orgType: "CONTRACTOR",
    email: "contractor-general@tara.dev",
    firstName: "Peter",
    lastName: "Kariuki",
    role: "CONTRACTOR",
  });
  await prisma.contractor.upsert({
    where: { organizationId: generalContractorOrg.id },
    create: {
      organizationId: generalContractorOrg.id,
      specialties: "General building contractor",
      location: "Thika, Kenya",
      verificationStatus: "VERIFIED",
    },
    update: {},
  });

  await upsertOrgWithUser({
    orgName: "SparkTech Electrical Contractors",
    orgType: "CONTRACTOR",
    email: "contractor-electrical@tara.dev",
    firstName: "Faith",
    lastName: "Wambui",
    role: "CONTRACTOR",
  });

  await upsertOrgWithUser({
    orgName: "FlowWorks Plumbing Contractors",
    orgType: "CONTRACTOR",
    email: "contractor-plumbing@tara.dev",
    firstName: "Samuel",
    lastName: "Kiptoo",
    role: "CONTRACTOR",
  });

  // ---------------------------------------------------------------------
  // Supplier price lists
  // ---------------------------------------------------------------------
  async function upsertPrice(supplierId: string, productId: string, price: number, leadTimeDays: number) {
    await prisma.supplierProduct.upsert({
      where: { supplierId_productId: { supplierId, productId } },
      create: { supplierId, productId, price: money(price), leadTimeDays },
      update: { price: money(price), leadTimeDays },
    });
  }

  await upsertPrice(cementSupplier.id, cement.id, 850, 2);
  await upsertPrice(cementSupplier.id, steelY12.id, 95000, 5);
  await upsertPrice(cementSupplier.id, steelY16.id, 98000, 5);
  await upsertPrice(cementSupplier.id, ballast.id, 2200, 1);
  await upsertPrice(cementSupplier.id, sand.id, 1800, 1);

  await upsertPrice(hardwareSupplier.id, cement.id, 870, 1);
  await upsertPrice(hardwareSupplier.id, steelY12.id, 93000, 4);
  await upsertPrice(hardwareSupplier.id, steelY16.id, 96500, 4);
  await upsertPrice(hardwareSupplier.id, ballast.id, 2100, 2);
  await upsertPrice(hardwareSupplier.id, sand.id, 1750, 2);
  await upsertPrice(hardwareSupplier.id, blocks.id, 55, 3);
  await upsertPrice(hardwareSupplier.id, roofingSheets.id, 1200, 5);
  await upsertPrice(hardwareSupplier.id, paint.id, 900, 3);

  // ---------------------------------------------------------------------
  // Project: Thika Residential Development — Demo Project
  // ---------------------------------------------------------------------
  let project = await prisma.project.findFirst({
    where: { name: "Thika Residential Development — Demo Project" },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        organizationId: developerOrg.id,
        name: "Thika Residential Development — Demo Project",
        type: "RESIDENTIAL",
        description:
          "A 12-unit residential development in Thika, Kiambu County — demo project used to exercise TARA's project-to-procurement workflow.",
        location: "Thika, Kiambu County, Kenya",
        latitude: money(-1.0333),
        longitude: money(37.0693),
        landReference: "Thika/Section IX/1234",
        estimatedProjectValue: money(45_000_000),
        estimatedConstructionCost: money(32_000_000),
        startDate: new Date("2026-03-01"),
        expectedCompletion: new Date("2027-06-30"),
        status: "CONSTRUCTION",
        createdById: developerUser.id,
        members: {
          create: [
            { userId: developerUser.id, role: "OWNER" },
            { userId: pmUser.id, role: "MANAGER" },
          ],
        },
        site: {
          create: {
            parcelReference: "Thika/Section IX/1234",
            location: "Off Garissa Road, Thika",
            latitude: money(-1.0333),
            longitude: money(37.0693),
            areaValue: money(1.5),
            areaUnit: "acres",
            tenureType: "FREEHOLD",
            ownershipInfo: "Held by TARA Demo Development Ltd under freehold title.",
            planningStatus: "APPROVED",
            developmentNotes: "Approved for a 12-unit residential development, R3 zoning.",
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------
  // BOQ
  // ---------------------------------------------------------------------
  let boq = await prisma.boq.findFirst({ where: { projectId: project.id } });
  if (!boq) {
    boq = await prisma.boq.create({
      data: {
        projectId: project.id,
        title: "Bill of Quantities — Phase 1",
        status: "ACTIVE",
        createdById: pmUser.id,
      },
    });

    const foundation = await prisma.boqSection.create({
      data: { boqId: boq.id, name: "Foundation Works", sequence: 0 },
    });
    const superstructure = await prisma.boqSection.create({
      data: { boqId: boq.id, name: "Superstructure", sequence: 1 },
    });
    const finishes = await prisma.boqSection.create({
      data: { boqId: boq.id, name: "Roofing & Finishes", sequence: 2 },
    });

    async function addItem(
      boqSectionId: string,
      description: string,
      productId: string,
      quantity: number,
      unit: string,
      unitCost: number,
      sequence: number,
    ) {
      return prisma.boqItem.create({
        data: {
          boqId: boq!.id,
          boqSectionId,
          productId,
          description,
          quantity: money(quantity),
          unit,
          estimatedUnitCost: money(unitCost),
          estimatedTotalCost: money(quantity * unitCost),
          sequence,
        },
      });
    }

    const cementItem = await addItem(foundation.id, "Portland Cement 50kg", cement.id, 500, "bag", 850, 0);
    const steelItem = await addItem(
      foundation.id,
      "Reinforcement Steel Y12",
      steelY12.id,
      2,
      "t",
      95000,
      1,
    );
    const ballastItem = await addItem(foundation.id, "Ballast", ballast.id, 30, "m3", 2200, 2);
    const sandItem = await addItem(foundation.id, "River Sand", sand.id, 20, "m3", 1800, 3);

    await addItem(superstructure.id, 'Concrete Blocks 6"', blocks.id, 5000, "pc", 55, 0);
    await addItem(superstructure.id, "Reinforcement Steel Y16", steelY16.id, 3, "t", 98000, 1);

    await addItem(finishes.id, "Roofing Sheets (Gauge 28)", roofingSheets.id, 200, "pc", 1200, 0);
    await addItem(finishes.id, "Exterior Emulsion Paint", paint.id, 50, "L", 900, 1);

    // -------------------------------------------------------------------
    // RFQ + quotations for the foundation-works materials
    // -------------------------------------------------------------------
    const rfq = await prisma.rfq.create({
      data: {
        projectId: project.id,
        boqId: boq.id,
        title: "Cement, Steel & Aggregates — Foundation Works",
        status: "OPEN",
        dueDate: new Date("2026-10-15"),
        notes: "Quotes requested for all foundation-works materials in a single delivery schedule.",
        createdById: pmUser.id,
        items: {
          create: [
            { boqItemId: cementItem.id, description: cementItem.description, quantity: cementItem.quantity, unit: cementItem.unit },
            { boqItemId: steelItem.id, description: steelItem.description, quantity: steelItem.quantity, unit: steelItem.unit },
            { boqItemId: ballastItem.id, description: ballastItem.description, quantity: ballastItem.quantity, unit: ballastItem.unit },
            { boqItemId: sandItem.id, description: sandItem.description, quantity: sandItem.quantity, unit: sandItem.unit },
          ],
        },
        rfqSuppliers: {
          create: [
            { supplierId: cementSupplier.id, status: "QUOTED" },
            { supplierId: hardwareSupplier.id, status: "QUOTED" },
          ],
        },
      },
      include: { items: true },
    });

    await prisma.boqItem.updateMany({
      where: { id: { in: [cementItem.id, steelItem.id, ballastItem.id, sandItem.id] } },
      data: { procurementStatus: "QUOTED" },
    });

    async function createQuotation(
      supplierId: string,
      prices: Record<string, number>,
      deliveryCost: number,
      taxAmount: number,
      notes: string,
    ) {
      const lineItems = rfq.items.map((item) => {
        const unitPrice = prices[item.description];
        const lineTotal = Number(item.quantity) * unitPrice;
        return {
          rfqItemId: item.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: money(unitPrice),
          lineTotal: money(lineTotal),
        };
      });
      const subtotal = lineItems.reduce((sum, li) => sum + Number(li.lineTotal), 0);
      const total = subtotal + deliveryCost + taxAmount;

      return prisma.quotation.create({
        data: {
          rfqId: rfq.id,
          supplierId,
          status: "SUBMITTED",
          validUntil: new Date("2026-11-01"),
          deliveryCost: money(deliveryCost),
          taxAmount: money(taxAmount),
          subtotal: money(subtotal),
          total: money(total),
          notes,
          submittedAt: new Date(),
          items: { create: lineItems },
        },
        include: { items: true },
      });
    }

    await createQuotation(
      cementSupplier.id,
      {
        "Portland Cement 50kg": 850,
        "Reinforcement Steel Y12": 95000,
        Ballast: 2200,
        "River Sand": 1800,
      },
      15000,
      12920,
      "Delivery within 2 days of order confirmation.",
    );

    const hardwareQuotation = await createQuotation(
      hardwareSupplier.id,
      {
        "Portland Cement 50kg": 870,
        "Reinforcement Steel Y12": 93000,
        Ballast: 2100,
        "River Sand": 1750,
      },
      8000,
      13098,
      "Bulk discount applied. Same-day delivery available within Kiambu County.",
    );

    // ---------------------------------------------------------------------
    // Award the lower-total quotation and issue a purchase order from it,
    // demonstrating the ACCEPTED quotation -> PurchaseOrder chain.
    // ---------------------------------------------------------------------
    const acceptedQuotation = await prisma.quotation.update({
      where: { id: hardwareQuotation.id },
      data: { status: "ACCEPTED" },
    });
    await prisma.rfq.update({ where: { id: rfq.id }, data: { status: "AWARDED" } });
    await prisma.boqItem.updateMany({
      where: { id: { in: [cementItem.id, steelItem.id, ballastItem.id, sandItem.id] } },
      data: { procurementStatus: "ORDERED" },
    });

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        projectId: project.id,
        quotationId: acceptedQuotation.id,
        supplierId: hardwareSupplier.id,
        poNumber: "PO-0001",
        status: "ACCEPTED",
        issueDate: new Date("2026-09-10"),
        expectedDeliveryDate: new Date("2026-09-20"),
        terms: "Payment due within 30 days of delivery. Bulk discount applied per quotation.",
        deliveryCost: acceptedQuotation.deliveryCost,
        taxAmount: acceptedQuotation.taxAmount,
        subtotal: acceptedQuotation.subtotal,
        total: acceptedQuotation.total,
        createdById: pmUser.id,
        items: {
          create: hardwareQuotation.items.map((item) => ({
            quotationItemId: item.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    // -------------------------------------------------------------------
    // A first, partial delivery against PO-0001 — cement and sand have
    // arrived on site, steel and ballast are still outstanding. This
    // demonstrates recomputePurchaseOrderDeliveryStatus moving the PO from
    // ACCEPTED to PARTIALLY_DELIVERED.
    // -------------------------------------------------------------------
    const cementPoItem = purchaseOrder.items.find((i) => i.description === "Portland Cement 50kg")!;
    const sandPoItem = purchaseOrder.items.find((i) => i.description === "River Sand")!;

    const firstDelivery = await prisma.delivery.create({
      data: {
        purchaseOrderId: purchaseOrder.id,
        status: "DELIVERED",
        expectedDate: new Date("2026-09-18"),
        deliveredDate: new Date("2026-09-18"),
        location: "Site store, Thika Residential Development",
        receivedById: pmUser.id,
        notes: "First batch received in good condition. Steel and ballast still outstanding.",
        createdById: pmUser.id,
        items: {
          create: [
            {
              purchaseOrderItemId: cementPoItem.id,
              description: cementPoItem.description,
              quantity: cementPoItem.quantity,
              unit: cementPoItem.unit,
            },
            {
              purchaseOrderItemId: sandPoItem.id,
              description: sandPoItem.description,
              quantity: sandPoItem.quantity,
              unit: sandPoItem.unit,
            },
          ],
        },
      },
    });
    await recomputePurchaseOrderDeliveryStatus(purchaseOrder.id);

    // -------------------------------------------------------------------
    // A general contractor agreement for the project's construction works.
    // -------------------------------------------------------------------
    const contract = await prisma.contract.create({
      data: {
        projectId: project.id,
        title: "General Contractor Agreement — Phase 1",
        contractType: "CONSTRUCTION",
        value: money(28_000_000),
        startDate: new Date("2026-03-15"),
        endDate: new Date("2027-05-31"),
        obligations:
          "Contractor to deliver foundation, superstructure, roofing and finishing works per the approved BOQ and drawings, subject to TARA Demo Development Ltd's supervision and sign-off at each milestone.",
        status: "ACTIVE",
        createdById: developerUser.id,
      },
    });
    await prisma.contractParty.createMany({
      data: [
        { contractId: contract.id, organizationId: developerOrg.id, role: "CLIENT" },
        { contractId: contract.id, organizationId: generalContractorOrg.id, role: "CONTRACTOR" },
      ],
    });

    // -------------------------------------------------------------------
    // A milestone tied to the contract, in progress.
    // -------------------------------------------------------------------
    await prisma.milestone.create({
      data: {
        projectId: project.id,
        contractId: contract.id,
        name: "Foundation Complete",
        description: "Excavation, blinding, footings and foundation walls complete and cured.",
        plannedDate: new Date("2026-09-30"),
        percentage: 15,
        responsibleOrgId: generalContractorOrg.id,
        paymentAmount: money(4_200_000),
        status: "IN_PROGRESS",
        notes: `First delivery (${firstDelivery.id.slice(-6)}) received on site; awaiting remaining steel and ballast before pour.`,
        createdById: pmUser.id,
      },
    });
  }

  console.log("\nSeed complete.");
  console.log(`Demo password for all seeded accounts: ${DEMO_PASSWORD}\n`);
  console.log("Accounts:");
  console.log("  developer@tara.dev          (DEVELOPER, owns TARA Demo Development Ltd)");
  console.log("  pm@tara.dev                 (PROJECT_MANAGER, manages the demo project)");
  console.log("  supplier-cement@tara.dev    (SUPPLIER, Rift Valley Cement Suppliers Ltd)");
  console.log("  supplier-hardware@tara.dev  (SUPPLIER, Jenga Hardware & Steel Supplies)");
  console.log("  supplier-electrical@tara.dev(SUPPLIER, SparkTech Electrical Supplies)");
  console.log("  supplier-plumbing@tara.dev  (SUPPLIER, FlowWorks Plumbing Supplies)");
  console.log("  contractor-general@tara.dev (CONTRACTOR, BuildRight General Contractors)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
