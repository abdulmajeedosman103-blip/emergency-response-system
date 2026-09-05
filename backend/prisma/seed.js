// backend/prisma/seed.js
// Development seed data — simulated/fictional records only.
// Idempotent: safe to run repeatedly (upserts on unique keys / fixed ids).
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

const DEMO_PASSWORD = 'DemoPass@123';
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const minutesAgo = (m) => new Date(now.getTime() - m * 60000);
const daysAgo = (d) => new Date(now.getTime() - d * DAY);

const ID = {
  incident1: '10000000-0000-4000-8000-000000000001', // collapse at market
  incident2: '10000000-0000-4000-8000-000000000002', // kitchen fire
  incident3: '10000000-0000-4000-8000-000000000003', // shoplifting
  incident4: '10000000-0000-4000-8000-000000000004', // road collision
  incident5: '10000000-0000-4000-8000-000000000005', // assisted labour (resolved)
  incident6: '10000000-0000-4000-8000-000000000006', // false alarm (cancelled)
  assignment1: '20000000-0000-4000-8000-000000000001',
  assignment2: '20000000-0000-4000-8000-000000000002',
  evidence1: '30000000-0000-4000-8000-000000000001',
  notification1: '40000000-0000-4000-8000-000000000001',
  notification2: '40000000-0000-4000-8000-000000000002',
  notification3: '40000000-0000-4000-8000-000000000003',
};

const organizations = [
  { name: 'MercyField Ambulance Service', type: 'AMBULANCE_SERVICE' },
  { name: 'BlazeGuard Fire Service', type: 'FIRE_SERVICE' },
  { name: 'Sentinel City Police Unit', type: 'POLICE_SERVICE' },
  { name: 'UnityCare Hospital', type: 'HOSPITAL' },
  { name: 'RescueNet Disaster Response', type: 'DISASTER_RESPONSE' },
];

const users = [
  { email: 'admin@demo.dev', fullName: 'Kwame Appiah', role: 'ADMIN' },
  { email: 'operator1@demo.dev', fullName: 'Ama Serwaa', role: 'OPERATOR' },
  { email: 'operator2@demo.dev', fullName: 'Kojo Mensah', role: 'OPERATOR' },
  { email: 'responder1@demo.dev', fullName: 'Yaw Boateng', role: 'RESPONDER' },
  { email: 'responder2@demo.dev', fullName: 'Efua Asantewaa', role: 'RESPONDER' },
  { email: 'responder3@demo.dev', fullName: 'Kofi Adjei', role: 'RESPONDER' },
  { email: 'citizen@demo.dev', fullName: 'Abena Owusu', role: 'CITIZEN' },
];

const responders = [
  { userEmail: 'responder1@demo.dev', org: 'MercyField Ambulance Service', specialization: 'MEDICAL', lat: 5.6037, lng: -0.187 },
  { userEmail: 'responder2@demo.dev', org: 'BlazeGuard Fire Service', specialization: 'FIRE', lat: 5.6037, lng: -0.187 },
  { userEmail: 'responder3@demo.dev', org: 'Sentinel City Police Unit', specialization: 'CRIME', lat: 5.5617, lng: -0.179 },
];

async function main() {
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 12);

  for (const org of organizations) {
    await prisma.organization.upsert({
      where: { name: org.name },
      update: { type: org.type },
      create: org,
    });
  }

  const orgIds = {};
  for (const org of organizations) {
    orgIds[org.name] = (await prisma.organization.findUnique({ where: { name: org.name } })).id;
  }

  const userIds = {};
  for (const u of users) {
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role, passwordHash, isActive: true },
      create: { ...u, passwordHash },
    });
    userIds[u.email] = rec.id;
  }

  const responderIds = {};
  for (const r of responders) {
    const rec = await prisma.responder.upsert({
      where: { userId: userIds[r.userEmail] },
      update: {
        organizationId: orgIds[r.org],
        specialization: r.specialization,
        availability: 'AVAILABLE',
        currentLatitude: r.lat,
        currentLongitude: r.lng,
        lastLocationAt: now,
      },
      create: {
        userId: userIds[r.userEmail],
        organizationId: orgIds[r.org],
        specialization: r.specialization,
        availability: 'AVAILABLE',
        currentLatitude: r.lat,
        currentLongitude: r.lng,
        lastLocationAt: now,
      },
    });
    responderIds[r.userEmail] = rec.id;
  }

  const citizenId = userIds['citizen@demo.dev'];
  const operator1 = userIds['operator1@demo.dev'];
  const operator2 = userIds['operator2@demo.dev'];
  const responder1User = userIds['responder1@demo.dev'];

  await prisma.emergencyIncident.upsert({
    where: { id: ID.incident1 },
    update: {},
    create: {
      id: ID.incident1,
      reporterId: citizenId,
      type: 'MEDICAL',
      description: 'A person collapsed at Makola Market and is unresponsive.',
      locationLatitude: 5.5468,
      locationLongitude: -0.2065,
      locationAddress: 'Makola Market, Accra',
      peopleAffected: 1,
      priority: 'HIGH',
      status: 'VERIFIED',
      citizenContactConsent: true,
      verifiedById: operator1,
      verifiedAt: minutesAgo(25),
      createdAt: minutesAgo(35),
    },
  });

  await prisma.emergencyIncident.upsert({
    where: { id: ID.incident2 },
    update: {},
    create: {
      id: ID.incident2,
      reporterId: citizenId,
      type: 'FIRE',
      description: 'Kitchen fire in a residential flat in Adabraka; smoke visible from the street.',
      locationLatitude: 5.5731,
      locationLongitude: -0.1981,
      locationAddress: 'Adabraka, Accra',
      peopleAffected: 3,
      priority: 'CRITICAL',
      status: 'REPORTED',
      citizenContactConsent: false,
      createdAt: minutesAgo(8),
    },
  });

  await prisma.emergencyIncident.upsert({
    where: { id: ID.incident3 },
    update: {},
    create: {
      id: ID.incident3,
      reporterId: citizenId,
      type: 'CRIME',
      description: 'Shoplifting reported at a store on Oxford Street, Osu; suspect seen leaving on foot.',
      locationLatitude: 5.5617,
      locationLongitude: -0.179,
      locationAddress: 'Oxford Street, Osu, Accra',
      peopleAffected: 1,
      priority: 'MEDIUM',
      status: 'REPORTED',
      citizenContactConsent: true,
      createdAt: minutesAgo(18),
    },
  });

  await prisma.emergencyIncident.upsert({
    where: { id: ID.incident4 },
    update: {},
    create: {
      id: ID.incident4,
      reporterId: citizenId,
      type: 'ROAD_ACCIDENT',
      description: 'Two-vehicle collision on Ring Road; one driver trapped in the vehicle.',
      locationLatitude: 5.597,
      locationLongitude: -0.195,
      locationAddress: 'Ring Road, Accra',
      peopleAffected: 2,
      priority: 'HIGH',
      status: 'RESPONDER_ASSIGNED',
      citizenContactConsent: true,
      verifiedById: operator2,
      verifiedAt: minutesAgo(27),
      assignedAt: minutesAgo(20),
      createdAt: minutesAgo(30),
    },
  });

  const incident5Created = daysAgo(2);
  await prisma.emergencyIncident.upsert({
    where: { id: ID.incident5 },
    update: {},
    create: {
      id: ID.incident5,
      reporterId: citizenId,
      type: 'MEDICAL',
      description: 'Woman in labour requiring urgent ambulance transport.',
      locationLatitude: 5.6037,
      locationLongitude: -0.187,
      locationAddress: 'Central Accra',
      peopleAffected: 1,
      priority: 'HIGH',
      status: 'RESOLVED',
      citizenContactConsent: true,
      verifiedById: operator2,
      verifiedAt: new Date(incident5Created.getTime() + 5 * 60000),
      assignedAt: new Date(incident5Created.getTime() + 10 * 60000),
      enRouteAt: new Date(incident5Created.getTime() + 15 * 60000),
      arrivedAt: new Date(incident5Created.getTime() + 30 * 60000),
      resolvedById: responder1User,
      resolvedAt: new Date(incident5Created.getTime() + 70 * 60000),
      createdAt: incident5Created,
    },
  });

  const incident6Created = daysAgo(1);
  await prisma.emergencyIncident.upsert({
    where: { id: ID.incident6 },
    update: {},
    create: {
      id: ID.incident6,
      reporterId: citizenId,
      type: 'OTHER',
      description: 'Caller reported a possible fire behind a warehouse complex.',
      locationLatitude: 5.615,
      locationLongitude: -0.209,
      locationAddress: 'Industrial Area, Accra',
      peopleAffected: 1,
      priority: 'LOW',
      status: 'CANCELLED',
      citizenContactConsent: false,
      cancelledById: operator1,
      cancelledAt: new Date(incident6Created.getTime() + 5 * 60000),
      cancelReason: 'No emergency found at the reported location.',
      createdAt: incident6Created,
    },
  });

  await prisma.emergencyAssignment.upsert({
    where: { id: ID.assignment1 },
    update: {},
    create: {
      id: ID.assignment1,
      incidentId: ID.incident4,
      responderId: responderIds['responder1@demo.dev'],
      assignedById: operator1,
      status: 'ACCEPTED',
      distanceKmAtAssignment: 2.4,
      assignedAt: minutesAgo(20),
      respondedAt: minutesAgo(18),
    },
  });

  await prisma.emergencyAssignment.upsert({
    where: { id: ID.assignment2 },
    update: {},
    create: {
      id: ID.assignment2,
      incidentId: ID.incident5,
      responderId: responderIds['responder1@demo.dev'],
      assignedById: operator2,
      status: 'COMPLETED',
      distanceKmAtAssignment: 3.1,
      assignedAt: new Date(incident5Created.getTime() + 10 * 60000),
      respondedAt: new Date(incident5Created.getTime() + 13 * 60000),
      completedAt: new Date(incident5Created.getTime() + 70 * 60000),
    },
  });

  await prisma.emergencyEvidence.upsert({
    where: { id: ID.evidence1 },
    update: {},
    create: {
      id: ID.evidence1,
      incidentId: ID.incident2,
      uploadedById: citizenId,
      fileName: 'kitchen-fire.jpg',
      filePath: 'uploads/kitchen-fire.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1258291,
      createdAt: minutesAgo(8),
    },
  });

  await prisma.notification.upsert({
    where: { id: ID.notification1 },
    update: {},
    create: {
      id: ID.notification1,
      userId: citizenId,
      type: 'RESPONDER_ASSIGNED',
      title: 'Responder assigned',
      message: 'A responder has been assigned to your road accident report.',
      data: { incidentId: ID.incident4 },
      isRead: false,
      createdAt: minutesAgo(18),
    },
  });

  await prisma.notification.upsert({
    where: { id: ID.notification2 },
    update: {},
    create: {
      id: ID.notification2,
      userId: citizenId,
      type: 'INCIDENT_RESOLVED',
      title: 'Incident resolved',
      message: 'Your medical emergency was resolved successfully.',
      data: { incidentId: ID.incident5 },
      isRead: true,
      createdAt: daysAgo(1),
    },
  });

  await prisma.notification.upsert({
    where: { id: ID.notification3 },
    update: {},
    create: {
      id: ID.notification3,
      userId: operator1,
      type: 'INCIDENT_REPORTED',
      title: 'CRITICAL: New emergency',
      message: 'New CRITICAL fire incident reported at Adabraka.',
      data: { incidentId: ID.incident2 },
      isRead: false,
      createdAt: minutesAgo(8),
    },
  });

  const counts = {
    organizations: await prisma.organization.count(),
    users: await prisma.user.count(),
    responders: await prisma.responder.count(),
    incidents: await prisma.emergencyIncident.count(),
    assignments: await prisma.emergencyAssignment.count(),
    evidence: await prisma.emergencyEvidence.count(),
    notifications: await prisma.notification.count(),
  };
  console.log('Seed complete:', JSON.stringify(counts, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });