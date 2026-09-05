// backend/src/services/authService.js
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const { signToken } = require('../utils/jwt');
const auditService = require('./auditService');

const BCRYPT_ROUNDS = 12;

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  createdAt: true,
};

async function registerUser({ email, fullName, password }, ipAddress) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    // New public registrations are always citizens.
    data: {
      email: normalizedEmail,
      fullName: fullName.trim(),
      passwordHash,
      role: 'CITIZEN',
    },
    select: PUBLIC_USER_FIELDS,
  });

  // After the create committed. Only identity data — never secrets.
  await auditService.record({
    action: 'USER_CREATED',
    actorId: null,
    entityType: 'USER',
    entityId: user.id,
    details: { email: user.email, role: user.role },
    ipAddress,
  });

  return user;
}

async function loginUser({ email, password }, ipAddress) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  const passwordMatches =
    user && user.isActive ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !user.isActive || !passwordMatches) {
    // Generic message: do not reveal whether the email exists.
    throw new AppError(401, 'Invalid email or password.');
  }

  const token = signToken({ sub: user.id, role: user.role });

  // Only after a successful, authenticated login.
  await auditService.record({
    action: 'USER_LOGGED_IN',
    actorId: user.id,
    entityType: 'USER',
    entityId: user.id,
    details: { role: user.role },
    ipAddress,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  };
}

module.exports = { registerUser, loginUser };