import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  BusinessOrganization,
  BusinessWorkOrder,
  BusinessRegisteredAddress,
  BusinessRecurringContract,
} from '../types';

class BusinessCareService {
  /**
   * Fetches organizations where the user is a member
   */
  public async getOrganizationsForUser(userId: string): Promise<BusinessOrganization[]> {
    try {
      const q = query(collection(db, 'business_organizations'), firestoreLimit(50));
      const snap = await getDocs(q);
      const list: BusinessOrganization[] = [];

      snap.forEach((d) => {
        const org = d.data() as BusinessOrganization;
        const isMember = org.members?.some((m) => m.userId === userId);
        if (isMember) {
          list.push(org);
        }
      });

      return list;
    } catch (e) {
      console.warn('[BusinessCareService] Error fetching organizations:', e);
      return [];
    }
  }

  /**
   * Creates a new business organization profile
   */
  public async createOrganization(
    orgData: Omit<BusinessOrganization, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: BusinessOrganization['status'] }
  ): Promise<BusinessOrganization> {
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newOrg: BusinessOrganization = {
      ...orgData,
      id: orgId,
      status: 'pending_verification',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'business_organizations', orgId), newOrg);
    return newOrg;
  }

  /**
   * Fetches single organization
   */
  public async getOrganization(orgId: string): Promise<BusinessOrganization | null> {
    try {
      const snap = await getDoc(doc(db, 'business_organizations', orgId));
      if (snap.exists()) return snap.data() as BusinessOrganization;
    } catch (e) {
      console.warn('[BusinessCareService] Error fetching org:', e);
    }
    return null;
  }

  /**
   * Adds address to organization
   */
  public async addAddressToOrg(orgId: string, address: Omit<BusinessRegisteredAddress, 'id'>): Promise<void> {
    const orgRef = doc(db, 'business_organizations', orgId);
    const snap = await getDoc(orgRef);
    if (!snap.exists()) return;

    const org = snap.data() as BusinessOrganization;
    const newAddressItem: BusinessRegisteredAddress = {
      ...address,
      id: `addr_${Date.now()}`,
    };

    await updateDoc(orgRef, {
      registeredAddresses: [...(org.registeredAddresses || []), newAddressItem],
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Creates work order for an organization
   */
  public async createWorkOrder(
    workOrderData: Omit<BusinessWorkOrder, 'id' | 'createdAt' | 'status' | 'updatedAt'>
  ): Promise<BusinessWorkOrder> {
    const woId = `wo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newWorkOrder: BusinessWorkOrder = {
      ...workOrderData,
      id: woId,
      status: 'created',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'business_work_orders', woId), newWorkOrder);
    return newWorkOrder;
  }

  /**
   * Fetches work orders for an organization
   */
  public async getWorkOrdersForOrg(orgId: string): Promise<BusinessWorkOrder[]> {
    try {
      const q = query(
        collection(db, 'business_work_orders'),
        where('orgId', '==', orgId),
        firestoreLimit(100)
      );
      const snap = await getDocs(q);
      const list: BusinessWorkOrder[] = [];
      snap.forEach((d) => list.push(d.data() as BusinessWorkOrder));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (e) {
      console.warn('[BusinessCareService] Error fetching work orders:', e);
      return [];
    }
  }

  /**
   * Approves a work order
   */
  public async approveWorkOrder(woId: string, approvedBy: string): Promise<void> {
    const woRef = doc(db, 'business_work_orders', woId);
    await updateDoc(woRef, {
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Fetches all organizations for Admin management
   */
  public async getAllOrganizations(): Promise<BusinessOrganization[]> {
    try {
      const q = query(collection(db, 'business_organizations'), firestoreLimit(100));
      const snap = await getDocs(q);
      const list: BusinessOrganization[] = [];
      snap.forEach((d) => list.push(d.data() as BusinessOrganization));
      return list;
    } catch (e) {
      console.warn('[BusinessCareService] Error getting all orgs:', e);
      return [];
    }
  }

  /**
   * Admin updates organization verification status
   */
  public async setOrganizationStatus(orgId: string, status: BusinessOrganization['status']): Promise<void> {
    await updateDoc(doc(db, 'business_organizations', orgId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const businessCareService = new BusinessCareService();
