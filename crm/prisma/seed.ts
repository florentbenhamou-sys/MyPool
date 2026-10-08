/**
 * ============================================================================
 *  SEED — DONNÉES DE DÉVELOPPEMENT / DÉMONSTRATION UNIQUEMENT
 * ============================================================================
 *  Référentiels (tags, cibles de démo, vecteurs) : créés ou mis à jour (idempotent).
 *  Catalogue et données CRM fictives : créés seulement si la base est vide
 *  (aucune entité), pour ne jamais polluer une base réelle.
 *
 *  Ne pas exécuter en production avec SEED_DEMO_DATA=true.
 *    npm run db:seed                      → référentiels + démo si base vide
 *    SEED_DEMO_DATA=false npm run db:seed → référentiels seulement
 * ============================================================================
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { computeCustomerPrice } from "../src/domain/pricing";

const prisma = new PrismaClient();
const seedDemo = process.env.SEED_DEMO_DATA !== "false";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const daysFromNow = (n: number, hour = 10) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(hour - 2, 0, 0, 0); // ≈ heure de Paris
  return d;
};
const dateOnly = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return day(d.toISOString().slice(0, 10));
};

function priced(listPrice: string, discount = "0") {
  return {
    listPrice: new Prisma.Decimal(listPrice),
    discount: new Prisma.Decimal(discount),
    customerPrice: new Prisma.Decimal(computeCustomerPrice(listPrice, discount).toFixed(2)),
  };
}

async function seedReferences() {
  const tags = [
    ["S4", "S/4HANA", "ENVIRONMENT"],
    ["ECC6", "ECC 6", "ENVIRONMENT"],
    ["RISE", "RISE with SAP", "ENVIRONMENT"],
    ["PRIVATE_CLOUD", "Private Cloud", "ENVIRONMENT"],
    ["PUBLIC_CLOUD", "Public Cloud", "ENVIRONMENT"],
    ["ERP", "ERP", "TARGET"],
    ["FIORI", "Fiori", "TARGET"],
    ["MDG", "MDG", "TARGET"],
    ["ARIBA", "Ariba", "TARGET"],
    ["MYSYSID", "MySysID", "TARGET"],
    ["E2S", "E2S", "TARGET"],
    ["R_AND_A", "R&A", "TARGET"],
  ] as const;
  for (const [i, [code, label, category]] of tags.entries()) {
    await prisma.tag.upsert({
      where: { code },
      update: {},
      create: { code, label, category, order: i },
    });
  }

  const targets = [
    ["ERP", "ERP"],
    ["FIORI", "Fiori"],
    ["MDG", "MDG"],
    ["ARIBA", "Ariba"],
    ["MYSYSID", "MySysID"],
    ["E2S", "E2S"],
    ["R_AND_A", "R&A"],
  ] as const;
  for (const [i, [code, label]] of targets.entries()) {
    await prisma.demoTarget.upsert({
      where: { code },
      update: {},
      create: { code, label, order: i },
    });
  }

  const channelTypes = [
    ["COMPANY", "Société"],
    ["PERSON", "Personne"],
    ["EVENT", "Événement / salon"],
    ["WEBSITE", "Site web"],
    ["REFERRAL", "Recommandation"],
    ["OTHER", "Autre"],
  ] as const;
  for (const [i, [code, label]] of channelTypes.entries()) {
    await prisma.contactChannelType.upsert({
      where: { code },
      update: {},
      create: { code, label, order: i },
    });
  }
}

async function seedCatalog() {
  const products = [
    ["SIS_ERP", "SIS INSIDE SAP ERP", "Solution SIS intégrée à SAP ERP."],
    ["SIS_ERP_MDF", "SIS INSIDE SAP ERP + MDF", "Solution SIS intégrée à SAP ERP avec module MDF."],
  ] as const;
  for (const [code, name, description] of products) {
    await prisma.product.upsert({
      where: { code },
      update: {},
      create: { code, name, description },
    });
  }

  const subscriptions = [
    ["SUB-STD", "Souscription Standard (annuelle) — DÉMO", "12000.00"],
    ["SUB-PREM", "Souscription Premium (annuelle) — DÉMO", "18000.00"],
    ["SUB-ENT", "Souscription Enterprise (annuelle) — DÉMO", "30000.00"],
  ] as const;
  for (const [code, description, price] of subscriptions) {
    await prisma.subscription.upsert({
      where: { code },
      update: {},
      create: { code, description, listPriceAnnual: new Prisma.Decimal(price) },
    });
  }

  const services = [
    ["SVC-INSTALL", "Installation et paramétrage — DÉMO", "8000.00"],
    ["SVC-MIGR", "Migration des données — DÉMO", "12000.00"],
    ["SVC-TRAIN", "Formation utilisateurs (2 jours) — DÉMO", "3000.00"],
  ] as const;
  for (const [code, description, price] of services) {
    await prisma.service.upsert({
      where: { code },
      update: {},
      create: { code, description, listPrice: new Prisma.Decimal(price) },
    });
  }

  const maintenances = [
    ["MAINT-STD", "Maintenance corrective — DÉMO", "2500.00"],
    ["MAINT-24", "Support étendu 24/7 — DÉMO", "6000.00"],
  ] as const;
  for (const [code, description, price] of maintenances) {
    await prisma.maintenance.upsert({
      where: { code },
      update: {},
      create: { code, description, listPrice: new Prisma.Decimal(price) },
    });
  }
}

async function seedDemoCrm() {
  if ((await prisma.entity.count()) > 0) {
    console.log("  Des entités existent déjà : données CRM de démonstration ignorées.");
    return;
  }
  const channel = async (code: string) =>
    (await prisma.contactChannelType.findUniqueOrThrow({ where: { code } })).id;
  const tag = async (code: string) => (await prisma.tag.findUniqueOrThrow({ where: { code } })).id;
  const target = async (code: string) =>
    (await prisma.demoTarget.findUniqueOrThrow({ where: { code } })).id;

  // --- Entité 1 : prospect actif avec proposition ---
  const acme = await prisma.entity.create({
    data: {
      name: "ACME Industrie (démo)",
      status: "PROSPECT",
      communicationLanguage: "fr",
      website: "https://acme.example",
      addressLine1: "12 rue de l'Exemple",
      postalCode: "69002",
      city: "Lyon",
      country: "France",
      notes: "Données fictives de démonstration.",
      tags: { create: [{ tagId: await tag("S4") }, { tagId: await tag("RISE") }] },
      contacts: {
        create: [
          {
            firstName: "Jean",
            lastName: "Dupont",
            email: "jean.dupont@acme.example",
            phone: "+33 6 00 00 00 01",
            role: "DSI",
          },
          {
            firstName: "Claire",
            lastName: "Martin",
            email: "claire.martin@acme.example",
            role: "Responsable achats",
          },
        ],
      },
    },
    include: { contacts: true },
  });
  const jean = acme.contacts.find((c) => c.lastName === "Dupont")!;

  await prisma.contactChannel.createMany({
    data: [
      { entityId: acme.id, typeId: await channel("COMPANY"), contactDate: day("2026-01-12") },
      {
        entityId: acme.id,
        typeId: await channel("PERSON"),
        contactId: jean.id,
        contactDate: day("2026-01-15"),
      },
      {
        entityId: acme.id,
        typeId: await channel("EVENT"),
        eventName: "Salon SAP Inside",
        contactDate: day("2026-02-20"),
      },
    ],
  });

  const meeting1 = await prisma.meeting.create({
    data: {
      entityId: acme.id,
      counter: 1,
      type: "MEETING",
      title: "Découverte du besoin",
      meetingDate: daysFromNow(-20, 14),
      notes: "Périmètre : ERP + Fiori.",
      nextSteps: "Organiser une démo Fiori.",
      contacts: { create: [{ contactId: jean.id }] },
      tags: { create: [{ tagId: await tag("FIORI") }] },
    },
  });
  await prisma.meeting.create({
    data: {
      entityId: acme.id,
      counter: 2,
      type: "PRESENTATION",
      title: "Présentation de la proposition",
      meetingDate: daysFromNow(5, 10),
      demoTargetId: await target("ERP"),
      contacts: { create: acme.contacts.map((c) => ({ contactId: c.id })) },
    },
  });
  await prisma.demo.create({
    data: {
      entityId: acme.id,
      meetingId: meeting1.id,
      counter: 1,
      title: "Démo Fiori & MDG",
      demoDate: daysFromNow(-10, 15),
      notes: "Très bon accueil.",
      targets: {
        create: [{ demoTargetId: await target("FIORI") }, { demoTargetId: await target("MDG") }],
      },
      tags: { create: [{ tagId: await tag("S4") }] },
    },
  });
  const rfp = await prisma.rfpRfi.create({
    data: {
      entityId: acme.id,
      type: "RFP",
      counter: 1,
      title: "Appel d'offres plateforme SIS",
      contactDate: dateOnly(-15),
      responseDate: dateOnly(20),
      presentationDate: dateOnly(35),
    },
  });

  // --- Proposition avec 2 scénarios alternatifs et des combinaisons ---
  const product = await prisma.product.findUniqueOrThrow({ where: { code: "SIS_ERP" } });
  const subStd = await prisma.subscription.findUniqueOrThrow({ where: { code: "SUB-STD" } });
  const subPrem = await prisma.subscription.findUniqueOrThrow({ where: { code: "SUB-PREM" } });
  const svcInstall = await prisma.service.findUniqueOrThrow({ where: { code: "SVC-INSTALL" } });
  const svcMigr = await prisma.service.findUniqueOrThrow({ where: { code: "SVC-MIGR" } });
  const maint = await prisma.maintenance.findUniqueOrThrow({ where: { code: "MAINT-STD" } });

  await prisma.proposal.create({
    data: {
      entityId: acme.id,
      number: `P-${new Date().getUTCFullYear()}-0001`,
      creationDate: dateOnly(-3),
      validityDate: dateOnly(27),
      contractDuration: 36,
      status: "IN_PREPARATION",
      rfpRfiId: rfp.id,
      notes: "Proposition de démonstration.",
      products: {
        create: {
          productId: product.id,
          displayNameSnapshot: product.name,
          displayDescriptionSnapshot: product.description,
          scenarios: {
            create: [
              {
                name: "Standard",
                order: 0,
                subscriptions: {
                  create: [
                    {
                      subscriptionId: subStd.id,
                      codeSnapshot: subStd.code,
                      descriptionSnapshot: subStd.description,
                      ...priced("12000.00", "10"),
                    },
                  ],
                },
                services: {
                  create: [
                    {
                      serviceId: svcInstall.id,
                      codeSnapshot: svcInstall.code,
                      descriptionSnapshot: svcInstall.description,
                      ...priced("8000.00"),
                      options: {
                        create: [{ description: "Paramétrage avancé", ...priced("1500.00") }],
                      },
                    },
                  ],
                },
                maintenances: {
                  create: [
                    {
                      maintenanceId: maint.id,
                      codeSnapshot: maint.code,
                      descriptionSnapshot: maint.description,
                      ...priced("2500.00"),
                    },
                  ],
                },
              },
              {
                name: "Premium (au choix)",
                description: "Deux souscriptions × deux services : 4 combinaisons possibles.",
                order: 1,
                subscriptions: {
                  create: [
                    {
                      subscriptionId: subStd.id,
                      codeSnapshot: subStd.code,
                      descriptionSnapshot: subStd.description,
                      ...priced("12000.00"),
                      order: 0,
                    },
                    {
                      subscriptionId: subPrem.id,
                      codeSnapshot: subPrem.code,
                      descriptionSnapshot: subPrem.description,
                      ...priced("18000.00", "15"),
                      order: 1,
                    },
                  ],
                },
                services: {
                  create: [
                    {
                      serviceId: svcInstall.id,
                      codeSnapshot: svcInstall.code,
                      descriptionSnapshot: svcInstall.description,
                      ...priced("8000.00"),
                      order: 0,
                      options: {
                        create: [
                          { description: "Option reprise historique", ...priced("2000.00", "50") },
                        ],
                      },
                    },
                    {
                      serviceId: svcMigr.id,
                      codeSnapshot: svcMigr.code,
                      descriptionSnapshot: svcMigr.description,
                      ...priced("12000.00", "20"),
                      order: 1,
                    },
                  ],
                },
                additionalOptions: {
                  create: [
                    { description: "Atelier de cadrage offert", ...priced("1000.00", "100") },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  // --- Entité 2 : client ---
  const globex = await prisma.entity.create({
    data: {
      name: "Globex SA (démo)",
      status: "CLIENT",
      communicationLanguage: "en",
      city: "Genève",
      country: "Suisse",
      tags: { create: [{ tagId: await tag("ECC6") }] },
      contacts: {
        create: [
          {
            firstName: "Anna",
            lastName: "Schmidt",
            email: "anna.schmidt@globex.example",
            role: "CFO",
          },
        ],
      },
    },
  });
  await prisma.contactChannel.create({
    data: {
      entityId: globex.id,
      typeId: await channel("REFERRAL"),
      contactDate: day("2025-11-03"),
      notes: "Recommandé par ACME.",
    },
  });
  await prisma.rfpRfi.create({
    data: {
      entityId: globex.id,
      type: "RFI",
      counter: 1,
      title: "Demande d'information MDG",
      contactDate: dateOnly(-5),
    },
  });

  // --- Entité 3 : prospect issu d'un salon ---
  const initech = await prisma.entity.create({
    data: {
      name: "Initech (démo)",
      status: "PROSPECT",
      contacts: {
        create: [
          {
            firstName: "Paul",
            lastName: "Bernard",
            email: "p.bernard@initech.example",
            phone: "+33 6 00 00 00 02",
          },
        ],
      },
    },
    include: { contacts: true },
  });
  await prisma.contactChannel.create({
    data: {
      entityId: initech.id,
      typeId: await channel("EVENT"),
      contactId: initech.contacts[0]!.id,
      eventName: "Salon SAP Inside",
      contactDate: dateOnly(-1),
    },
  });
}

async function main() {
  console.log("Seed (données de DÉVELOPPEMENT)…");
  await seedReferences();
  if (seedDemo) {
    await seedCatalog();
    await seedDemoCrm();
  }
  console.log("Seed terminé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
