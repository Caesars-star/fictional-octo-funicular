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
import { recomputeInvoicePaymentStatus } from "../src/lib/invoices";

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
    orgType: "DEVELOPER" | "SUPPLIER" | "CONTRACTOR" | "PLATFORM" | "AGENT_NETWORK";
    email: string;
    firstName: string;
    lastName: string;
    role:
      | "PLATFORM_ADMIN"
      | "DEVELOPER"
      | "PROJECT_MANAGER"
      | "SUPPLIER"
      | "CONTRACTOR"
      | "AGENT";
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
  // Agent network: a field agent who recruits participants, generates
  // leads and performs on-site verification work. See Module 17 (Agent
  // System) in the product brief and "Financial controls" in SECURITY.md
  // for why commission/status changes are oversight-gated away from the
  // agent's own account.
  // ---------------------------------------------------------------------
  const { org: agentNetworkOrg, user: agentUser } = await upsertOrgWithUser({
    orgName: "TARA Field Agents Network",
    orgType: "AGENT_NETWORK",
    email: "agent@tara.dev",
    firstName: "Wanjiru",
    lastName: "Kamau",
    role: "AGENT",
  });
  const agent = await prisma.agent.upsert({
    where: { userId: agentUser.id },
    create: {
      userId: agentUser.id,
      organizationId: agentNetworkOrg.id,
      status: "ACTIVE",
      phone: "+254712345678",
      region: "Kiambu County",
      commissionRate: money(5),
      notes: "Covers Thika, Ruiru and surrounding Kiambu County developments.",
    },
    update: {},
  });

  // A network manager — an ADMIN member of the agent's organization, but
  // not an agent themselves — demonstrates the requireAgentOversight
  // "converted/approved by someone other than the agent" path live, since
  // Wanjiru (the agent) is otherwise the only member of her own org.
  const agentManagerUser = await prisma.user.upsert({
    where: { email: "agent-manager@tara.dev" },
    create: {
      email: "agent-manager@tara.dev",
      passwordHash,
      firstName: "Daniel",
      lastName: "Mutua",
      role: "ORGANIZATION_ADMIN",
    },
    update: {},
  });
  await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: agentNetworkOrg.id, userId: agentManagerUser.id } },
    create: { organizationId: agentNetworkOrg.id, userId: agentManagerUser.id, role: "ADMIN" },
    update: {},
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

    // -------------------------------------------------------------------
    // A second, already-verified milestone with an invoice raised and
    // paid against it — demonstrating the full
    // MILESTONE(VERIFIED) -> INVOICE -> PAYMENT -> PAID chain end to end.
    // -------------------------------------------------------------------
    const mobilizationMilestone = await prisma.milestone.create({
      data: {
        projectId: project.id,
        contractId: contract.id,
        name: "Site Mobilization",
        description: "Site fencing, hoarding, welfare facilities and access road established.",
        plannedDate: new Date("2026-03-20"),
        actualDate: new Date("2026-03-22"),
        percentage: 5,
        responsibleOrgId: generalContractorOrg.id,
        paymentAmount: money(2_000_000),
        status: "VERIFIED",
        notes: "Verified by the project manager on-site walkthrough.",
        createdById: pmUser.id,
      },
    });

    const mobilizationInvoice = await prisma.invoice.create({
      data: {
        projectId: project.id,
        issuedByOrgId: generalContractorOrg.id,
        contractId: contract.id,
        milestoneId: mobilizationMilestone.id,
        invoiceNumber: "BR-2026-001",
        status: "APPROVED",
        dueDate: new Date("2026-04-15"),
        subtotal: money(2_000_000),
        taxAmount: money(320_000),
        total: money(2_320_000),
        notes: "Site mobilization milestone, per General Contractor Agreement — Phase 1.",
        createdById: pmUser.id,
      },
    });
    await prisma.payment.create({
      data: {
        projectId: project.id,
        invoiceId: mobilizationInvoice.id,
        payerOrgId: developerOrg.id,
        payeeOrgId: generalContractorOrg.id,
        amount: money(2_320_000),
        paymentDate: new Date("2026-04-05"),
        paymentMethod: "BANK_TRANSFER",
        reference: "TARA-PAY-0001",
        notes: "Paid in full on approval.",
        recordedById: pmUser.id,
      },
    });
    await recomputeInvoicePaymentStatus(mobilizationInvoice.id);

    // -------------------------------------------------------------------
    // A materials invoice against PO-0001, for the batch already
    // delivered, partially paid — demonstrating PARTIALLY_PAID derived
    // from a payment less than the invoice total.
    // -------------------------------------------------------------------
    const materialsInvoice = await prisma.invoice.create({
      data: {
        projectId: project.id,
        issuedByOrgId: hardwareOrg.id,
        purchaseOrderId: purchaseOrder.id,
        invoiceNumber: "JHS-2026-0458",
        status: "APPROVED",
        dueDate: new Date("2026-10-05"),
        subtotal: money(470_000),
        taxAmount: money(75_200),
        total: money(545_200),
        notes: "Covers the cement and river sand delivered on 18 Sept 2026.",
        createdById: pmUser.id,
      },
    });
    await prisma.payment.create({
      data: {
        projectId: project.id,
        invoiceId: materialsInvoice.id,
        payerOrgId: developerOrg.id,
        payeeOrgId: hardwareOrg.id,
        amount: money(300_000),
        paymentDate: new Date("2026-09-25"),
        paymentMethod: "MOBILE_MONEY",
        reference: "MPESA-QGT4F8K2",
        notes: "Partial payment pending final delivery of steel and ballast.",
        recordedById: pmUser.id,
      },
    });
    await recomputeInvoicePaymentStatus(materialsInvoice.id);
  }

  // ---------------------------------------------------------------------
  // Agent network activity against the demo project: a converted lead (the
  // general contractor, recruited by the field agent), a qualified lead
  // still in progress, on-site activity logging, and an approved
  // commission — demonstrating LEAD -> CONVERTED -> COMMISSION end to end,
  // and a second lead mid-pipeline to exercise the status controls live in
  // the demo. Guarded independently of the BOQ/RFQ/PO chain above so it
  // still seeds on a database that already has that chain from before the
  // Agents module existed.
  // ---------------------------------------------------------------------
  const existingContractorLead = await prisma.lead.findFirst({
    where: { agentId: agent.id, organizationName: "BuildRight General Contractors" },
  });
  if (!existingContractorLead) {
    const contractorLead = await prisma.lead.create({
      data: {
        agentId: agent.id,
        type: "CONTRACTOR",
        organizationName: "BuildRight General Contractors",
        contactName: "Peter Kariuki",
        contactPhone: "+254722000111",
        notes: "Recruited via the agent's Thika contractor referral network.",
        status: "CONVERTED",
        convertedOrganizationId: generalContractorOrg.id,
      },
    });
    await prisma.lead.create({
      data: {
        agentId: agent.id,
        type: "DEVELOPER",
        organizationName: "Uzima Homes Ltd",
        contactName: "Rose Achieng",
        contactPhone: "+254733000222",
        notes: "Prospective developer for a Ruiru townhouse project — awaiting site visit.",
        status: "QUALIFIED",
      },
    });
    await prisma.agentActivity.createMany({
      data: [
        {
          agentId: agent.id,
          type: "ORGANIZATION_RECRUITED",
          description:
            "Recruited BuildRight General Contractors onto TARA and introduced them to the Thika Residential Development project.",
          relatedProjectId: project.id,
          relatedOrganizationId: generalContractorOrg.id,
          relatedLeadId: contractorLead.id,
          occurredAt: new Date("2026-02-20"),
          createdById: agentUser.id,
        },
        {
          agentId: agent.id,
          type: "SITE_VISIT",
          description: "Site visit to verify foundation progress ahead of the milestone sign-off.",
          relatedProjectId: project.id,
          occurredAt: new Date("2026-09-18"),
          createdById: agentUser.id,
        },
      ],
    });
    await prisma.commission.create({
      data: {
        agentId: agent.id,
        leadId: contractorLead.id,
        projectId: project.id,
        sourceType: "ORGANIZATION_RECRUITMENT",
        description: "Recruitment commission for onboarding BuildRight General Contractors.",
        amount: money(150_000),
        status: "APPROVED",
        createdById: developerUser.id,
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
  console.log("  agent@tara.dev              (AGENT, TARA Field Agents Network)");
  console.log("  agent-manager@tara.dev      (ORGANIZATION_ADMIN, oversees TARA Field Agents Network)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
