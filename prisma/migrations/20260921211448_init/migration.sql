-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'ORGANIZATION_ADMIN', 'DEVELOPER', 'PROJECT_MANAGER', 'SUPPLIER', 'CONTRACTOR', 'CONSULTANT', 'AGENT', 'FINANCE_PARTNER', 'HOMEOWNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('DEVELOPER', 'SUPPLIER', 'CONTRACTOR', 'CONSULTANT', 'AGENT_NETWORK', 'PLATFORM', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrgMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'INFRASTRUCTURE', 'MIXED_USE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('CONCEPT', 'FEASIBILITY', 'PLANNING', 'PROCUREMENT', 'CONSTRUCTION', 'COMPLETION', 'OPERATIONAL', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "TenureType" AS ENUM ('FREEHOLD', 'LEASEHOLD', 'COMMUNITY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('NOT_APPLIED', 'APPLIED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TITLE_DEED', 'CONTRACT', 'BOQ', 'QUOTATION', 'INVOICE', 'RECEIPT', 'DRAWING', 'PERMIT', 'CERTIFICATE', 'DELIVERY_NOTE', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BoqStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcurementStatus" AS ENUM ('NOT_STARTED', 'RFQ_SENT', 'QUOTED', 'ORDERED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'AWARDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RfqSupplierStatus" AS ENUM ('INVITED', 'VIEWED', 'QUOTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "description" TEXT,
    "registrationNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "landReference" TEXT,
    "estimatedProjectValue" DECIMAL(16,2),
    "estimatedConstructionCost" DECIMAL(16,2),
    "startDate" TIMESTAMP(3),
    "expectedCompletion" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'CONCEPT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parcelReference" TEXT,
    "location" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "areaValue" DECIMAL(12,2),
    "areaUnit" TEXT,
    "tenureType" "TenureType" NOT NULL DEFAULT 'UNKNOWN',
    "ownershipInfo" TEXT,
    "planningStatus" "PlanningStatus" NOT NULL DEFAULT 'NOT_APPLIED',
    "developmentNotes" TEXT,
    "constraints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "organizationId" TEXT,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boq" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "BoqStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Boq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoqSection" (
    "id" TEXT NOT NULL,
    "boqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoqSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoqItem" (
    "id" TEXT NOT NULL,
    "boqId" TEXT NOT NULL,
    "boqSectionId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "estimatedUnitCost" DECIMAL(14,2) NOT NULL,
    "estimatedTotalCost" DECIMAL(16,2) NOT NULL,
    "actualUnitCost" DECIMAL(14,2),
    "actualTotalCost" DECIMAL(16,2),
    "supplierId" TEXT,
    "procurementStatus" "ProcurementStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "defaultUnitId" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "location" TEXT,
    "serviceArea" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "leadTimeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "specialties" TEXT,
    "location" TEXT,
    "serviceArea" TEXT,
    "registrationInfo" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "boqId" TEXT,
    "title" TEXT NOT NULL,
    "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqItem" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "boqItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqSupplier" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "RfqSupplierStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "deliveryCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "rfqItemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(16,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_projectId_key" ON "Site"("projectId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");

-- CreateIndex
CREATE INDEX "Boq_projectId_idx" ON "Boq"("projectId");

-- CreateIndex
CREATE INDEX "BoqSection_boqId_idx" ON "BoqSection"("boqId");

-- CreateIndex
CREATE INDEX "BoqItem_boqId_idx" ON "BoqItem"("boqId");

-- CreateIndex
CREATE INDEX "BoqItem_boqSectionId_idx" ON "BoqItem"("boqSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_abbreviation_key" ON "Unit"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_organizationId_key" ON "Supplier"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_productId_key" ON "SupplierProduct"("supplierId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_organizationId_key" ON "Contractor"("organizationId");

-- CreateIndex
CREATE INDEX "Rfq_projectId_idx" ON "Rfq"("projectId");

-- CreateIndex
CREATE INDEX "Rfq_status_idx" ON "Rfq"("status");

-- CreateIndex
CREATE INDEX "RfqItem_rfqId_idx" ON "RfqItem"("rfqId");

-- CreateIndex
CREATE INDEX "RfqSupplier_supplierId_idx" ON "RfqSupplier"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqSupplier_rfqId_supplierId_key" ON "RfqSupplier"("rfqId", "supplierId");

-- CreateIndex
CREATE INDEX "Quotation_rfqId_idx" ON "Quotation"("rfqId");

-- CreateIndex
CREATE INDEX "Quotation_supplierId_idx" ON "Quotation"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_rfqId_supplierId_key" ON "Quotation"("rfqId", "supplierId");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationItem_rfqItemId_idx" ON "QuotationItem"("rfqItemId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boq" ADD CONSTRAINT "Boq_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boq" ADD CONSTRAINT "Boq_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoqSection" ADD CONSTRAINT "BoqSection_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "Boq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoqItem" ADD CONSTRAINT "BoqItem_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "Boq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoqItem" ADD CONSTRAINT "BoqItem_boqSectionId_fkey" FOREIGN KEY ("boqSectionId") REFERENCES "BoqSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoqItem" ADD CONSTRAINT "BoqItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoqItem" ADD CONSTRAINT "BoqItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_defaultUnitId_fkey" FOREIGN KEY ("defaultUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractor" ADD CONSTRAINT "Contractor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "Boq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqItem" ADD CONSTRAINT "RfqItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqItem" ADD CONSTRAINT "RfqItem_boqItemId_fkey" FOREIGN KEY ("boqItemId") REFERENCES "BoqItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqSupplier" ADD CONSTRAINT "RfqSupplier_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqSupplier" ADD CONSTRAINT "RfqSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_rfqItemId_fkey" FOREIGN KEY ("rfqItemId") REFERENCES "RfqItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
