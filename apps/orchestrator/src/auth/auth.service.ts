import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { sendVerificationEmail } from "./email.service";

const JWT_SECRET = process.env.JWT_SECRET || "anturon-dev-secret";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function signToken(user: any) {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export class AuthService {
  async register(data: {
    organizationName: string;
    industry?: string;
    region?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    phone?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.adminEmail },
    });

    if (existing) {
      throw new Error("Email already registered");
    }

    const orgId = `org_${Date.now()}`;
    const userId = `user_${Date.now()}`;
    const slug = `${slugify(data.organizationName)}-${Date.now()}`;
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    const organization = await prisma.organization.create({
      data: {
        id: orgId,
        name: data.organizationName,
        slug,
        industry: data.industry || null,
        region: data.region || null,
      },
    });

    const user = await prisma.user.create({
      data: {
        id: userId,
        organizationId: organization.id,
        name: data.adminName,
        email: data.adminEmail,
        phoneNumber: data.phone || null,
        passwordHash,
        emailVerified: false,
      },
    });

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await prisma.verificationToken.create({
      data: {
        id: `vt_${Date.now()}`,
        userId: user.id,
        token: verificationToken,
        type: "email_verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(user.email, verificationToken, user.name);

    return {
      message: "Account created. Please verify your email before login.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      organization,
    };
  }

  async verifyEmail(token: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: { include: { organization: true } } },
    });

    if (!record) {
      throw new Error("Invalid verification token");
    }

    if (record.usedAt) {
      throw new Error("Verification token already used");
    }

    if (record.expiresAt < new Date()) {
      throw new Error("Verification token expired");
    }

    const user = await prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
      include: { organization: true },
    });

    await prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const jwtToken = signToken(user);

    return {
      message: "Email verified successfully",
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      organization: user.organization,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) throw new Error("Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error("Invalid email or password");

    if (!user.isActive) throw new Error("Account is inactive");

    if (!user.emailVerified) {
      throw new Error("Please verify your email before login");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      organization: user.organization,
    };
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) throw new Error("User not found");

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      organization: user.organization,
    };
  }
}

export const authService = new AuthService();