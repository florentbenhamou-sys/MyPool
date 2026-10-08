-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('PROSPECT', 'CLIENT');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('MEETING', 'PRESENTATION');

-- CreateEnum
CREATE TYPE "RfpRfiType" AS ENUM ('RFP', 'RFI');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'IN_PREPARATION', 'SENT', 'NEGOTIATION', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "objectType" TEXT NOT NULL,
    "objectId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactChannelType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContactChannelType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoTarget" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DemoTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EntityStatus" NOT NULL DEFAULT 'PROSPECT',
    "communicationLanguage" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMPTZ(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityTag" (
    "entityId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "EntityTag_pkey" PRIMARY KEY ("entityId","tagId")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactChannel" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "typeId" UUID NOT NULL,
    "contactId" UUID,
    "eventName" TEXT,
    "contactDate" DATE NOT NULL,
    "notes" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ContactChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "type" "MeetingType" NOT NULL DEFAULT 'MEETING',
    "counter" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "meetingDate" TIMESTAMPTZ(3) NOT NULL,
    "demoTargetId" UUID,
    "notes" TEXT,
    "transcript" TEXT,
    "nextSteps" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingContact" (
    "meetingId" UUID NOT NULL,
    "contactId" UUID NOT NULL,

    CONSTRAINT "MeetingContact_pkey" PRIMARY KEY ("meetingId","contactId")
);

-- CreateTable
CREATE TABLE "MeetingTag" (
    "meetingId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "MeetingTag_pkey" PRIMARY KEY ("meetingId","tagId")
);

-- CreateTable
CREATE TABLE "Demo" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "meetingId" UUID,
    "counter" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "demoDate" TIMESTAMPTZ(3) NOT NULL,
    "notes" TEXT,
    "transcript" TEXT,
    "nextSteps" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Demo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoDemoTarget" (
    "demoId" UUID NOT NULL,
    "demoTargetId" UUID NOT NULL,

    CONSTRAINT "DemoDemoTarget_pkey" PRIMARY KEY ("demoId","demoTargetId")
);

-- CreateTable
CREATE TABLE "DemoTag" (
    "demoId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "DemoTag_pkey" PRIMARY KEY ("demoId","tagId")
);

-- CreateTable
CREATE TABLE "RfpRfi" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "type" "RfpRfiType" NOT NULL,
    "counter" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "contactDate" DATE NOT NULL,
    "responseDate" DATE,
    "presentationDate" DATE,
    "notes" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RfpRfi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfpRfiFile" (
    "id" UUID NOT NULL,
    "rfpRfiId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfpRfiFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "listPriceAnnual" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "listPrice" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "listPrice" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "creationDate" DATE NOT NULL,
    "validityDate" DATE,
    "contractDuration" INTEGER,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "rfpRfiId" UUID,
    "archivedAt" TIMESTAMPTZ(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalProduct" (
    "id" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "displayNameSnapshot" TEXT NOT NULL,
    "displayDescriptionSnapshot" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "ProposalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" UUID NOT NULL,
    "proposalProductId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "selectedCombinationKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioSubscription" (
    "id" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "subscriptionId" UUID,
    "codeSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT NOT NULL,
    "listPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "customerPrice" DECIMAL(14,2) NOT NULL,
    "displayDiscount" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScenarioSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioService" (
    "id" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "serviceId" UUID,
    "codeSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT NOT NULL,
    "listPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "customerPrice" DECIMAL(14,2) NOT NULL,
    "displayDiscount" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScenarioService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioServiceOption" (
    "id" UUID NOT NULL,
    "scenarioServiceId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "listPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "customerPrice" DECIMAL(14,2) NOT NULL,
    "displayDiscount" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScenarioServiceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioMaintenance" (
    "id" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "maintenanceId" UUID,
    "codeSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT NOT NULL,
    "listPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "customerPrice" DECIMAL(14,2) NOT NULL,
    "displayDiscount" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScenarioMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioOption" (
    "id" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "listPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "customerPrice" DECIMAL(14,2) NOT NULL,
    "displayDiscount" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScenarioOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_objectType_objectId_idx" ON "AuditLog"("objectType", "objectId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_code_key" ON "Tag"("code");

-- CreateIndex
CREATE INDEX "Tag_category_idx" ON "Tag"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ContactChannelType_code_key" ON "ContactChannelType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DemoTarget_code_key" ON "DemoTarget"("code");

-- CreateIndex
CREATE INDEX "Entity_name_idx" ON "Entity"("name");

-- CreateIndex
CREATE INDEX "Entity_status_idx" ON "Entity"("status");

-- CreateIndex
CREATE INDEX "EntityTag_tagId_idx" ON "EntityTag"("tagId");

-- CreateIndex
CREATE INDEX "Contact_entityId_idx" ON "Contact"("entityId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Contact_lastName_idx" ON "Contact"("lastName");

-- CreateIndex
CREATE INDEX "ContactChannel_entityId_idx" ON "ContactChannel"("entityId");

-- CreateIndex
CREATE INDEX "ContactChannel_contactDate_idx" ON "ContactChannel"("contactDate");

-- CreateIndex
CREATE INDEX "Meeting_meetingDate_idx" ON "Meeting"("meetingDate");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_entityId_counter_key" ON "Meeting"("entityId", "counter");

-- CreateIndex
CREATE INDEX "MeetingContact_contactId_idx" ON "MeetingContact"("contactId");

-- CreateIndex
CREATE INDEX "MeetingTag_tagId_idx" ON "MeetingTag"("tagId");

-- CreateIndex
CREATE INDEX "Demo_demoDate_idx" ON "Demo"("demoDate");

-- CreateIndex
CREATE UNIQUE INDEX "Demo_entityId_counter_key" ON "Demo"("entityId", "counter");

-- CreateIndex
CREATE INDEX "DemoDemoTarget_demoTargetId_idx" ON "DemoDemoTarget"("demoTargetId");

-- CreateIndex
CREATE INDEX "DemoTag_tagId_idx" ON "DemoTag"("tagId");

-- CreateIndex
CREATE INDEX "RfpRfi_responseDate_idx" ON "RfpRfi"("responseDate");

-- CreateIndex
CREATE UNIQUE INDEX "RfpRfi_entityId_counter_key" ON "RfpRfi"("entityId", "counter");

-- CreateIndex
CREATE UNIQUE INDEX "RfpRfiFile_storageKey_key" ON "RfpRfiFile"("storageKey");

-- CreateIndex
CREATE INDEX "RfpRfiFile_rfpRfiId_idx" ON "RfpRfiFile"("rfpRfiId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_code_key" ON "Subscription"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Maintenance_code_key" ON "Maintenance"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_number_key" ON "Proposal"("number");

-- CreateIndex
CREATE INDEX "Proposal_entityId_idx" ON "Proposal"("entityId");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_validityDate_idx" ON "Proposal"("validityDate");

-- CreateIndex
CREATE INDEX "ProposalProduct_proposalId_idx" ON "ProposalProduct"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalProduct_productId_idx" ON "ProposalProduct"("productId");

-- CreateIndex
CREATE INDEX "Scenario_proposalProductId_idx" ON "Scenario"("proposalProductId");

-- CreateIndex
CREATE INDEX "ScenarioSubscription_scenarioId_idx" ON "ScenarioSubscription"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioService_scenarioId_idx" ON "ScenarioService"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioServiceOption_scenarioServiceId_idx" ON "ScenarioServiceOption"("scenarioServiceId");

-- CreateIndex
CREATE INDEX "ScenarioMaintenance_scenarioId_idx" ON "ScenarioMaintenance"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioOption_scenarioId_idx" ON "ScenarioOption"("scenarioId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityTag" ADD CONSTRAINT "EntityTag_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityTag" ADD CONSTRAINT "EntityTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactChannel" ADD CONSTRAINT "ContactChannel_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactChannel" ADD CONSTRAINT "ContactChannel_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ContactChannelType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactChannel" ADD CONSTRAINT "ContactChannel_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_demoTargetId_fkey" FOREIGN KEY ("demoTargetId") REFERENCES "DemoTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingContact" ADD CONSTRAINT "MeetingContact_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingContact" ADD CONSTRAINT "MeetingContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingTag" ADD CONSTRAINT "MeetingTag_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingTag" ADD CONSTRAINT "MeetingTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demo" ADD CONSTRAINT "Demo_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demo" ADD CONSTRAINT "Demo_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoDemoTarget" ADD CONSTRAINT "DemoDemoTarget_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "Demo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoDemoTarget" ADD CONSTRAINT "DemoDemoTarget_demoTargetId_fkey" FOREIGN KEY ("demoTargetId") REFERENCES "DemoTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoTag" ADD CONSTRAINT "DemoTag_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "Demo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoTag" ADD CONSTRAINT "DemoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfpRfi" ADD CONSTRAINT "RfpRfi_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfpRfiFile" ADD CONSTRAINT "RfpRfiFile_rfpRfiId_fkey" FOREIGN KEY ("rfpRfiId") REFERENCES "RfpRfi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_rfpRfiId_fkey" FOREIGN KEY ("rfpRfiId") REFERENCES "RfpRfi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalProduct" ADD CONSTRAINT "ProposalProduct_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalProduct" ADD CONSTRAINT "ProposalProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_proposalProductId_fkey" FOREIGN KEY ("proposalProductId") REFERENCES "ProposalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioSubscription" ADD CONSTRAINT "ScenarioSubscription_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioSubscription" ADD CONSTRAINT "ScenarioSubscription_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioService" ADD CONSTRAINT "ScenarioService_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioService" ADD CONSTRAINT "ScenarioService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioServiceOption" ADD CONSTRAINT "ScenarioServiceOption_scenarioServiceId_fkey" FOREIGN KEY ("scenarioServiceId") REFERENCES "ScenarioService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioMaintenance" ADD CONSTRAINT "ScenarioMaintenance_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioMaintenance" ADD CONSTRAINT "ScenarioMaintenance_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioOption" ADD CONSTRAINT "ScenarioOption_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Contraintes d'intégrité métier (non exprimables dans le schéma Prisma)
-- Remise = pourcentage entre 0 et 100 ; prix jamais négatifs.
-- -----------------------------------------------------------------------------
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_price_check" CHECK ("listPriceAnnual" >= 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_price_check" CHECK ("listPrice" >= 0);
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_price_check" CHECK ("listPrice" >= 0);

ALTER TABLE "ScenarioSubscription" ADD CONSTRAINT "ScenarioSubscription_price_check"
  CHECK ("listPrice" >= 0 AND "customerPrice" >= 0 AND "discount" >= 0 AND "discount" <= 100);
ALTER TABLE "ScenarioService" ADD CONSTRAINT "ScenarioService_price_check"
  CHECK ("listPrice" >= 0 AND "customerPrice" >= 0 AND "discount" >= 0 AND "discount" <= 100);
ALTER TABLE "ScenarioServiceOption" ADD CONSTRAINT "ScenarioServiceOption_price_check"
  CHECK ("listPrice" >= 0 AND "customerPrice" >= 0 AND "discount" >= 0 AND "discount" <= 100);
ALTER TABLE "ScenarioMaintenance" ADD CONSTRAINT "ScenarioMaintenance_price_check"
  CHECK ("listPrice" >= 0 AND "customerPrice" >= 0 AND "discount" >= 0 AND "discount" <= 100);
ALTER TABLE "ScenarioOption" ADD CONSTRAINT "ScenarioOption_price_check"
  CHECK ("listPrice" >= 0 AND "customerPrice" >= 0 AND "discount" >= 0 AND "discount" <= 100);

ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_contractDuration_check"
  CHECK ("contractDuration" IS NULL OR "contractDuration" > 0);
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_counter_check" CHECK ("counter" > 0);
ALTER TABLE "Demo" ADD CONSTRAINT "Demo_counter_check" CHECK ("counter" > 0);
ALTER TABLE "RfpRfi" ADD CONSTRAINT "RfpRfi_counter_check" CHECK ("counter" > 0);
