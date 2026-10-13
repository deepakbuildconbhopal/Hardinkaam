import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FamilyHousehold, FamilyCareMemberAccess } from '../types';

class FamilyCareService {
  /**
   * Fetches households owned by or shared with the user
   */
  public async getHouseholdsForUser(userId: string, userPhoneOrEmail?: string): Promise<FamilyHousehold[]> {
    try {
      const ownedQuery = query(
        collection(db, 'family_care_profiles'),
        where('ownerId', '==', userId),
        firestoreLimit(30)
      );
      const ownedSnap = await getDocs(ownedQuery);
      const households: FamilyHousehold[] = [];

      ownedSnap.forEach((d) => {
        households.push(d.data() as FamilyHousehold);
      });

      // Also check shared households if email/phone provided
      if (userPhoneOrEmail) {
        const cleanTarget = userPhoneOrEmail.trim().toLowerCase();
        const allQuery = query(collection(db, 'family_care_profiles'), firestoreLimit(50));
        const allSnap = await getDocs(allQuery);

        allSnap.forEach((d) => {
          const item = d.data() as FamilyHousehold;
          if (item.ownerId !== userId) {
            const hasShared = item.sharedWith?.some(
              (s) =>
                s.status === 'accepted' &&
                (s.userId === userId || s.emailOrPhone.trim().toLowerCase() === cleanTarget)
            );
            if (hasShared && !households.some((h) => h.id === item.id)) {
              households.push(item);
            }
          }
        });
      }

      households.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return households;
    } catch (e) {
      console.warn('[FamilyCareService] Error fetching households:', e);
      return [];
    }
  }

  /**
   * Creates a new family household location
   */
  public async createHousehold(
    householdData: Omit<FamilyHousehold, 'id' | 'createdAt' | 'updatedAt' | 'sharedWith'>
  ): Promise<FamilyHousehold> {
    const householdId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newHousehold: FamilyHousehold = {
      ...householdData,
      id: householdId,
      sharedWith: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'family_care_profiles', householdId), newHousehold);
    return newHousehold;
  }

  /**
   * Invites another account with secure expiring invitation & permissions
   */
  public async inviteFamilyMember(
    householdId: string,
    emailOrPhone: string,
    role: 'coordinator' | 'viewer' = 'coordinator'
  ): Promise<void> {
    const householdRef = doc(db, 'family_care_profiles', householdId);
    const snap = await getDoc(householdRef);
    if (!snap.exists()) throw new Error('परिवार प्रोफ़ाइल नहीं मिली।');

    const household = snap.data() as FamilyHousehold;
    const now = Date.now();
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days expiry

    const cleanContact = emailOrPhone.trim().toLowerCase();
    const existingIndex = household.sharedWith?.findIndex(
      (s) => s.emailOrPhone.toLowerCase() === cleanContact
    );

    const newInvite: FamilyCareMemberAccess = {
      emailOrPhone: cleanContact,
      status: 'pending',
      role,
      invitedAt: new Date().toISOString(),
      expiresAt,
    };

    const updatedShared = [...(household.sharedWith || [])];
    if (existingIndex !== undefined && existingIndex >= 0) {
      updatedShared[existingIndex] = newInvite;
    } else {
      updatedShared.push(newInvite);
    }

    await updateDoc(householdRef, {
      sharedWith: updatedShared,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Accepts invitation from another account
   */
  public async acceptInvitation(householdId: string, userId: string, userContact: string): Promise<void> {
    const householdRef = doc(db, 'family_care_profiles', householdId);
    const snap = await getDoc(householdRef);
    if (!snap.exists()) throw new Error('आमंत्रण मान्य नहीं है।');

    const household = snap.data() as FamilyHousehold;
    const cleanContact = userContact.trim().toLowerCase();
    const invite = household.sharedWith?.find(
      (s) => s.emailOrPhone.toLowerCase() === cleanContact
    );

    if (!invite) throw new Error('आपके लिए इस प्रोफ़ाइल में कोई आमंत्रण नहीं है।');
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      throw new Error('यह आमंत्रण समाप्त (Expired) हो चुका है।');
    }

    const updatedShared = household.sharedWith.map((s) => {
      if (s.emailOrPhone.toLowerCase() === cleanContact) {
        return {
          ...s,
          status: 'accepted' as const,
          userId,
          acceptedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    await updateDoc(householdRef, {
      sharedWith: updatedShared,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Revokes access for a family member
   */
  public async revokeAccess(householdId: string, emailOrPhone: string): Promise<void> {
    const householdRef = doc(db, 'family_care_profiles', householdId);
    const snap = await getDoc(householdRef);
    if (!snap.exists()) return;

    const household = snap.data() as FamilyHousehold;
    const cleanContact = emailOrPhone.trim().toLowerCase();
    const updatedShared = (household.sharedWith || []).filter(
      (s) => s.emailOrPhone.toLowerCase() !== cleanContact
    );

    await updateDoc(householdRef, {
      sharedWith: updatedShared,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Deletes a household profile
   */
  public async deleteHousehold(householdId: string): Promise<void> {
    await deleteDoc(doc(db, 'family_care_profiles', householdId));
  }
}

export const familyCareService = new FamilyCareService();
