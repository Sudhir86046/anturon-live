/**
 * Org Provisioning Service
 * -------------------------------------------------
 * When a new org is created we:
 *  1. Store the shared VAPI "Sarah" assistant ID + shared phone number ID
 *     in the organization row (data isolation at our DB layer).
 *  2. Set a $5 starting wallet balance.
 *
 * All orgs share the same VAPI account, but every API call is scoped
 * through the org's stored assistantId / phoneNumberId, so each user
 * only ever sees "their" resources.
 */

import { prisma } from '../lib/prisma.js';
import { vapi } from '../lib/vapi.js';

// The one shared VAPI assistant ("Sarah") and phone number
// that every new org gets assigned by default.
// These are resolved once at runtime from VAPI and cached.
let cachedAssistantId: string | null = null;
let cachedPhoneNumberId: string | null = null;

async function getDefaultVapiResources(): Promise<{
  assistantId: string | null;
  phoneNumberId: string | null;
}> {
  // Return cached values if already resolved
  if (cachedAssistantId && cachedPhoneNumberId) {
    return { assistantId: cachedAssistantId, phoneNumberId: cachedPhoneNumberId };
  }

  try {
    const [assistants, phoneNumbers] = await Promise.all([
      vapi.assistants.list().catch(() => [] as any[]),
      vapi.phoneNumbers.list().catch(() => [] as any[]),
    ]);

    // Pick the assistant named "Sarah" (case-insensitive), fall back to first
    const sarah = assistants.find((a: any) =>
      a.name?.toLowerCase().includes('sarah')
    ) || assistants[0];

    // Pick the first available phone number
    const phone = phoneNumbers[0];

    cachedAssistantId   = sarah?.id   ?? null;
    cachedPhoneNumberId = phone?.id   ?? null;
  } catch (err) {
    console.error('[provision] Failed to fetch VAPI defaults:', err);
  }

  return { assistantId: cachedAssistantId, phoneNumberId: cachedPhoneNumberId };
}

/**
 * Call this after an org is created (e.g. after email verification).
 * Sets the default VAPI assistant + phone number + $5 wallet.
 */
export async function provisionOrganization(organizationId: string): Promise<void> {
  const { assistantId, phoneNumberId } = await getDefaultVapiResources();

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      walletBalance: 5.00,
      defaultVapiAssistantId:   assistantId   ?? undefined,
      defaultVapiPhoneNumberId: phoneNumberId ?? undefined,
    },
  });

  console.log(`[provision] Org ${organizationId} provisioned — assistant: ${assistantId}, phone: ${phoneNumberId}, wallet: $5.00`);
}
