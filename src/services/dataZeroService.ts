import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  writeBatch,
  query,
  where,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface DatabaseCollectionCounts {
  bookingsTotal: number;
  bookingsActive: number;
  bookingsCompletedOrCancelled: number;
  transactionsTotal: number;
  walletTransactionsTotal: number;
  paymentsTotal: number;
  servicemanPayoutsTotal: number;
  walletsTotal: number;
  walletsNonZero: number;
  messagesTotal: number;
  whatsappLogsTotal: number;
  notificationsTotal: number;
  reviewsTotal: number;
  kycDocsTotal: number;
  franchiseAppsTotal: number;
  bulkCampaignsTotal: number;
  passwordResetsTotal: number;
  serviceMenTotal: number;
  auditLogsTotal: number;
}

export interface AdvancedDeleteOptions {
  bookings: boolean;
  bookingsFilter: 'ALL' | 'COMPLETED_CANCELLED_ONLY' | 'OLDER_THAN_30_DAYS';
  transactions: boolean;
  transactionsFilter: 'ALL' | 'OLDER_THAN_30_DAYS';
  messages: boolean;
  whatsappLogs: boolean;
  notifications: boolean;
  reviews: boolean;
  kycDocuments: boolean;
  franchiseApplications: boolean;
  bulkCampaigns: boolean;
  passwordResetRequests: boolean;
  auditLogs: boolean;
}

export interface AdvancedUpdateOptions {
  resetWallets: boolean;
  walletTargetBalance: number;
  resetWalletPendingBalance: boolean;
  resetWalletLifetimeEarnings: boolean;

  resetTechnicians: boolean;
  techniciansSetOffline: boolean;
  techniciansResetJobsCounter: boolean;
  techniciansResetRatingToDefault: boolean;

  updateBookingsStatus: boolean;
  bookingsTargetStatus: 'CANCEL_PENDING' | 'ARCHIVE_COMPLETED';
  bookingsStatusNote?: string;

  resetPlatformSettings: boolean;
}

export interface AdvancedDataOperationsOptions {
  deleteOptions: AdvancedDeleteOptions;
  updateOptions: AdvancedUpdateOptions;
  adminEmail: string;
  adminUid: string;
  onProgress?: (statusText: string, percentage: number) => void;
}

export interface AdvancedOperationStats {
  // Deletions
  bookingsDeleted: number;
  transactionsDeleted: number;
  walletTransactionsDeleted: number;
  paymentsDeleted: number;
  payoutsDeleted: number;
  messagesDeleted: number;
  whatsappLogsDeleted: number;
  notificationsDeleted: number;
  reviewsDeleted: number;
  kycDocsDeleted: number;
  franchiseAppsDeleted: number;
  bulkCampaignsDeleted: number;
  passwordResetsDeleted: number;
  auditLogsDeleted: number;
  totalDeleted: number;

  // Updates / Resets
  walletsReset: number;
  techniciansUpdated: number;
  bookingsUpdated: number;
  settingsReset: boolean;
  totalUpdated: number;

  // Metadata
  executedAt: string;
  adminEmail: string;
}

// Backward-compatibility interfaces
export interface ZeroOutStats {
  bookingsDeleted: number;
  transactionsDeleted: number;
  walletTransactionsDeleted: number;
  notificationsDeleted: number;
  whatsappLogsDeleted: number;
  messagesDeleted: number;
  reviewsDeleted: number;
  kycDocsDeleted: number;
  walletsReset: number;
  totalDeleted: number;
}

export interface ZeroOutOptions {
  deleteBookings?: boolean;
  deleteTransactions?: boolean;
  deleteLogsAndMessages?: boolean;
  deleteReviews?: boolean;
  resetWalletsToZero?: boolean;
  deleteKycApplications?: boolean;
  adminEmail: string;
  adminUid: string;
  onProgress?: (statusText: string, percentage: number) => void;
}

/**
 * Fetch live collection counts from Firestore for live preview in the Admin Zero Data Center.
 */
export async function fetchDatabaseCollectionStats(): Promise<DatabaseCollectionCounts> {
  const counts: DatabaseCollectionCounts = {
    bookingsTotal: 0,
    bookingsActive: 0,
    bookingsCompletedOrCancelled: 0,
    transactionsTotal: 0,
    walletTransactionsTotal: 0,
    paymentsTotal: 0,
    servicemanPayoutsTotal: 0,
    walletsTotal: 0,
    walletsNonZero: 0,
    messagesTotal: 0,
    whatsappLogsTotal: 0,
    notificationsTotal: 0,
    reviewsTotal: 0,
    kycDocsTotal: 0,
    franchiseAppsTotal: 0,
    bulkCampaignsTotal: 0,
    passwordResetsTotal: 0,
    serviceMenTotal: 0,
    auditLogsTotal: 0,
  };

  try {
    const fetchPromises = [
      getDocs(collection(db, 'bookings'))
        .then((snap) => {
          counts.bookingsTotal = snap.size;
          snap.docs.forEach((d) => {
            const data = d.data();
            const status = (data.status || '').toLowerCase();
            if (['completed', 'cancelled', 'canceled', 'rejected'].includes(status)) {
              counts.bookingsCompletedOrCancelled++;
            } else {
              counts.bookingsActive++;
            }
          });
        })
        .catch(() => {}),

      getDocs(collection(db, 'transactions'))
        .then((snap) => {
          counts.transactionsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'wallet_transactions'))
        .then((snap) => {
          counts.walletTransactionsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'payments'))
        .then((snap) => {
          counts.paymentsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'serviceman_payouts'))
        .then((snap) => {
          counts.servicemanPayoutsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'wallets'))
        .then((snap) => {
          counts.walletsTotal = snap.size;
          snap.docs.forEach((d) => {
            const data = d.data();
            if ((data.balance || 0) > 0 || (data.pendingBalance || 0) > 0) {
              counts.walletsNonZero++;
            }
          });
        })
        .catch(() => {}),

      getDocs(collection(db, 'messages'))
        .then((snap) => {
          counts.messagesTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'whatsapp_logs'))
        .then((snap) => {
          counts.whatsappLogsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'notifications'))
        .then((snap) => {
          counts.notificationsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'reviews'))
        .then((snap) => {
          counts.reviewsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'kyc_documents'))
        .then((snap) => {
          counts.kycDocsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'franchise_applications'))
        .then((snap) => {
          counts.franchiseAppsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'bulk_campaigns'))
        .then((snap) => {
          counts.bulkCampaignsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'password_reset_requests'))
        .then((snap) => {
          counts.passwordResetsTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'service_men'))
        .then((snap) => {
          counts.serviceMenTotal = snap.size;
        })
        .catch(() => {}),

      getDocs(collection(db, 'audit_logs'))
        .then((snap) => {
          counts.auditLogsTotal = snap.size;
        })
        .catch(() => {}),
    ];

    await Promise.all(fetchPromises);
  } catch (err) {
    console.warn('Error querying collection counts:', err);
  }

  return counts;
}

/**
 * Execute fast batched deletion for an array of document IDs in a collection
 */
async function batchDeleteCollectionDocs(
  collectionName: string,
  docsToDelete: { id: string }[],
  onChunk?: (processed: number) => void
): Promise<number> {
  if (docsToDelete.length === 0) return 0;
  const chunkSize = 400;
  let deletedCount = 0;

  for (let i = 0; i < docsToDelete.length; i += chunkSize) {
    const chunk = docsToDelete.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      batch.delete(doc(db, collectionName, item.id));
    }
    await batch.commit();
    deletedCount += chunk.length;
    onChunk?.(deletedCount);
  }

  return deletedCount;
}

/**
 * Execute advanced selective deletion and update operations with audit trail
 */
export async function executeAdvancedDataOperations(
  options: AdvancedDataOperationsOptions
): Promise<AdvancedOperationStats> {
  const { deleteOptions, updateOptions, adminEmail, adminUid, onProgress } = options;

  const stats: AdvancedOperationStats = {
    bookingsDeleted: 0,
    transactionsDeleted: 0,
    walletTransactionsDeleted: 0,
    paymentsDeleted: 0,
    payoutsDeleted: 0,
    messagesDeleted: 0,
    whatsappLogsDeleted: 0,
    notificationsDeleted: 0,
    reviewsDeleted: 0,
    kycDocsDeleted: 0,
    franchiseAppsDeleted: 0,
    bulkCampaignsDeleted: 0,
    passwordResetsDeleted: 0,
    auditLogsDeleted: 0,
    totalDeleted: 0,

    walletsReset: 0,
    techniciansUpdated: 0,
    bookingsUpdated: 0,
    settingsReset: false,
    totalUpdated: 0,

    executedAt: new Date().toISOString(),
    adminEmail,
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysIso = thirtyDaysAgo.toISOString();

  try {
    // ----------------------------------------------------
    // SECTION 1: WHAT TO DELETE (क्या मिटाना है)
    // ----------------------------------------------------

    // 1. Delete Bookings
    if (deleteOptions.bookings) {
      onProgress?.('बुकिंग्स डेटा स्कैन व फ़िल्टर हो रहा है...', 10);
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const toDelete: { id: string }[] = [];

      for (const bDoc of bookingsSnap.docs) {
        const data = bDoc.data();
        const status = (data.status || '').toLowerCase();
        const createdAt = data.createdAt || data.date || '';

        if (deleteOptions.bookingsFilter === 'ALL') {
          toDelete.push({ id: bDoc.id });
        } else if (deleteOptions.bookingsFilter === 'COMPLETED_CANCELLED_ONLY') {
          if (['completed', 'cancelled', 'canceled', 'rejected'].includes(status)) {
            toDelete.push({ id: bDoc.id });
          }
        } else if (deleteOptions.bookingsFilter === 'OLDER_THAN_30_DAYS') {
          if (createdAt && createdAt < thirtyDaysIso) {
            toDelete.push({ id: bDoc.id });
          }
        }
      }

      onProgress?.(`${toDelete.length} बुकिंग्स डिलीट की जा रही हैं...`, 15);
      stats.bookingsDeleted = await batchDeleteCollectionDocs('bookings', toDelete);
    }

    // 2. Delete Transactions & Financial Ledger
    if (deleteOptions.transactions) {
      onProgress?.('वित्तीय लेनदेन व लेजर हिस्ट्री हटाई जा रही है...', 22);

      // transactions
      const transSnap = await getDocs(collection(db, 'transactions'));
      const transToDelete: { id: string }[] = [];
      for (const tDoc of transSnap.docs) {
        const data = tDoc.data();
        const date = data.createdAt || data.date || '';
        if (deleteOptions.transactionsFilter === 'ALL' || (date && date < thirtyDaysIso)) {
          transToDelete.push({ id: tDoc.id });
        }
      }
      stats.transactionsDeleted = await batchDeleteCollectionDocs('transactions', transToDelete);

      // wallet_transactions
      const wtSnap = await getDocs(collection(db, 'wallet_transactions'));
      const wtToDelete: { id: string }[] = [];
      for (const wtDoc of wtSnap.docs) {
        const data = wtDoc.data();
        const date = data.createdAt || data.date || '';
        if (deleteOptions.transactionsFilter === 'ALL' || (date && date < thirtyDaysIso)) {
          wtToDelete.push({ id: wtDoc.id });
        }
      }
      stats.walletTransactionsDeleted = await batchDeleteCollectionDocs('wallet_transactions', wtToDelete);

      // payments
      const paySnap = await getDocs(collection(db, 'payments'));
      stats.paymentsDeleted = await batchDeleteCollectionDocs(
        'payments',
        paySnap.docs.map((d) => ({ id: d.id }))
      );

      // serviceman_payouts
      const payoutSnap = await getDocs(collection(db, 'serviceman_payouts'));
      stats.payoutsDeleted = await batchDeleteCollectionDocs(
        'serviceman_payouts',
        payoutSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 3. Delete Messages / Chat Logs
    if (deleteOptions.messages) {
      onProgress?.('चैट संदेश व मीडिया रिकॉर्ड्स हटाए जा रहे हैं...', 35);
      const msgSnap = await getDocs(collection(db, 'messages'));
      stats.messagesDeleted = await batchDeleteCollectionDocs(
        'messages',
        msgSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 4. Delete WhatsApp Logs
    if (deleteOptions.whatsappLogs) {
      onProgress?.('व्हाट्सएप डिस्पैच लॉग्स हटाए जा रहे हैं...', 42);
      const waSnap = await getDocs(collection(db, 'whatsapp_logs'));
      stats.whatsappLogsDeleted = await batchDeleteCollectionDocs(
        'whatsapp_logs',
        waSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 5. Delete Notifications
    if (deleteOptions.notifications) {
      onProgress?.('उपयोगकर्ता नोटिफिकेशन अलर्ट्स हटाए जा रहे हैं...', 48);
      const notifSnap = await getDocs(collection(db, 'notifications'));
      stats.notificationsDeleted = await batchDeleteCollectionDocs(
        'notifications',
        notifSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 6. Delete Reviews
    if (deleteOptions.reviews) {
      onProgress?.('कस्टमर समीक्षाएं व रेटिंग्स हटाई जा रही हैं...', 54);
      const revSnap = await getDocs(collection(db, 'reviews'));
      stats.reviewsDeleted = await batchDeleteCollectionDocs(
        'reviews',
        revSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 7. Delete KYC Documents
    if (deleteOptions.kycDocuments) {
      onProgress?.('तकनीशियन केवाईसी दस्तावेज हटाए जा रहे हैं...', 60);
      const kycSnap = await getDocs(collection(db, 'kyc_documents'));
      stats.kycDocsDeleted = await batchDeleteCollectionDocs(
        'kyc_documents',
        kycSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 8. Delete Franchise Applications
    if (deleteOptions.franchiseApplications) {
      onProgress?.('फ्रेंचाइजी व पार्टनर लीड्स हटाई जा रही हैं...', 65);
      const franSnap = await getDocs(collection(db, 'franchise_applications'));
      stats.franchiseAppsDeleted = await batchDeleteCollectionDocs(
        'franchise_applications',
        franSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 9. Delete Bulk SMS Campaigns
    if (deleteOptions.bulkCampaigns) {
      onProgress?.('बल्क एसएमएस कैम्पेन हिस्ट्री हटाई जा रही है...', 70);
      const bulkSnap = await getDocs(collection(db, 'bulk_campaigns'));
      stats.bulkCampaignsDeleted = await batchDeleteCollectionDocs(
        'bulk_campaigns',
        bulkSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 10. Delete Password Reset Requests
    if (deleteOptions.passwordResetRequests) {
      onProgress?.('पासवर्ड रीसेट टिकट्स हटाए जा रहे हैं...', 74);
      const rstSnap = await getDocs(collection(db, 'password_reset_requests'));
      stats.passwordResetsDeleted = await batchDeleteCollectionDocs(
        'password_reset_requests',
        rstSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    // 11. Delete Historic Audit Logs
    if (deleteOptions.auditLogs) {
      onProgress?.('पुराने सुरक्षा ऑडिट लॉग्स साफ़ किए जा रहे हैं...', 78);
      const auditSnap = await getDocs(collection(db, 'audit_logs'));
      stats.auditLogsDeleted = await batchDeleteCollectionDocs(
        'audit_logs',
        auditSnap.docs.map((d) => ({ id: d.id }))
      );
    }

    stats.totalDeleted =
      stats.bookingsDeleted +
      stats.transactionsDeleted +
      stats.walletTransactionsDeleted +
      stats.paymentsDeleted +
      stats.payoutsDeleted +
      stats.messagesDeleted +
      stats.whatsappLogsDeleted +
      stats.notificationsDeleted +
      stats.reviewsDeleted +
      stats.kycDocsDeleted +
      stats.franchiseAppsDeleted +
      stats.bulkCampaignsDeleted +
      stats.passwordResetsDeleted +
      stats.auditLogsDeleted;

    // ----------------------------------------------------
    // SECTION 2: WHAT TO UPDATE / RESET (क्या अपडेट / रीसेट करना है)
    // ----------------------------------------------------

    // 1. Reset Wallets
    if (updateOptions.resetWallets) {
      onProgress?.('वॉलेट बैलेंस रीसेट किए जा रहे हैं...', 83);
      const walletsSnap = await getDocs(collection(db, 'wallets'));
      const targetBal = Number(updateOptions.walletTargetBalance) || 0;

      const chunkSize = 350;
      for (let i = 0; i < walletsSnap.docs.length; i += chunkSize) {
        const chunk = walletsSnap.docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        for (const wDoc of chunk) {
          const updatePayload: Record<string, any> = {
            balance: targetBal,
            updatedAt: new Date().toISOString(),
          };

          if (updateOptions.resetWalletPendingBalance) {
            updatePayload.pendingBalance = 0;
          }
          if (updateOptions.resetWalletLifetimeEarnings) {
            updatePayload.totalEarned = targetBal;
            updatePayload.totalWithdrawn = 0;
          }

          batch.update(doc(db, 'wallets', wDoc.id), updatePayload);
        }

        await batch.commit();
        stats.walletsReset += chunk.length;
      }
    }

    // 2. Reset Technicians / Service Men Status & Stats
    if (updateOptions.resetTechnicians) {
      onProgress?.('तकनीशियनों की ड्यूटी व आंकड़े रीसेट हो रहे हैं...', 88);

      const updateProsCollection = async (collName: string) => {
        try {
          const prosSnap = await getDocs(collection(db, collName));
          const chunkSize = 350;

          for (let i = 0; i < prosSnap.docs.length; i += chunkSize) {
            const chunk = prosSnap.docs.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            for (const pDoc of chunk) {
              const updatePayload: Record<string, any> = {
                updatedAt: new Date().toISOString(),
              };

              if (updateOptions.techniciansSetOffline) {
                updatePayload.isOnline = false;
                updatePayload.status = 'offline';
                updatePayload.activeBookingId = null;
              }
              if (updateOptions.techniciansResetJobsCounter) {
                updatePayload.jobsCompleted = 0;
              }
              if (updateOptions.techniciansResetRatingToDefault) {
                updatePayload.rating = 5.0;
                updatePayload.reviewCount = 0;
              }

              batch.update(doc(db, collName, pDoc.id), updatePayload);
            }

            await batch.commit();
            stats.techniciansUpdated += chunk.length;
          }
        } catch (e) {
          console.warn(`Error updating ${collName}:`, e);
        }
      };

      await updateProsCollection('service_men');
      await updateProsCollection('serviceMen');
    }

    // 3. Update Bookings Status (Update without deleting)
    if (updateOptions.updateBookingsStatus && !deleteOptions.bookings) {
      onProgress?.('बुकिंग स्थिति अपडेट की जा रही है...', 92);
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const chunkSize = 350;
      const targetAction = updateOptions.bookingsTargetStatus;

      for (let i = 0; i < bookingsSnap.docs.length; i += chunkSize) {
        const chunk = bookingsSnap.docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        let countInChunk = 0;

        for (const bDoc of chunk) {
          const data = bDoc.data();
          const currentStatus = (data.status || '').toLowerCase();

          if (targetAction === 'CANCEL_PENDING') {
            if (['pending', 'assigned', 'started', 'in_progress', 'scheduled'].includes(currentStatus)) {
              batch.update(doc(db, 'bookings', bDoc.id), {
                status: 'cancelled',
                cancellationReason:
                  updateOptions.bookingsStatusNote ||
                  'प्रशासनिक रीसेट: लंबित बुकिंग निरस्त की गई (Admin Bulk Action)',
                cancelledBy: 'admin',
                updatedAt: new Date().toISOString(),
              });
              countInChunk++;
            }
          } else if (targetAction === 'ARCHIVE_COMPLETED') {
            if (currentStatus === 'completed') {
              batch.update(doc(db, 'bookings', bDoc.id), {
                isArchived: true,
                archivedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              countInChunk++;
            }
          }
        }

        if (countInChunk > 0) {
          await batch.commit();
          stats.bookingsUpdated += countInChunk;
        }
      }
    }

    // 4. Reset Platform Settings
    if (updateOptions.resetPlatformSettings) {
      onProgress?.('डिफ़ॉल्ट प्लेटफ़ॉर्म सेटिंग्स लागू हो रही हैं...', 95);
      try {
        await setDoc(
          doc(db, 'settings', 'platform'),
          {
            commissionRate: 10,
            minimumWithdrawal: 200,
            gstPercentage: 18,
            safetyInspectionFee: 49,
            freeCancellationWindowHours: 2,
            supportContact: '918889997576',
            emergencyHotline: '1800-889-9975',
            businessName: 'HARDINKAAM by Deepak Buildcon',
            operationalCity: 'Bhopal',
            autoAssignRadiusKm: 8,
            updatedAt: new Date().toISOString(),
            updatedBy: adminEmail,
          },
          { merge: true }
        );
        stats.settingsReset = true;
      } catch (sErr) {
        console.warn('Could not reset platform settings:', sErr);
      }
    }

    stats.totalUpdated =
      stats.walletsReset +
      stats.techniciansUpdated +
      stats.bookingsUpdated +
      (stats.settingsReset ? 1 : 0);

    // ----------------------------------------------------
    // SECTION 3: WRITE AUDIT LOG (सुरक्षा ऑडिट रिकॉर्ड)
    // ----------------------------------------------------
    onProgress?.('ऑपरेशनल ऑडिट लॉग सुरक्षित किया जा रहा है...', 98);
    try {
      await addDoc(collection(db, 'audit_logs'), {
        userId: adminUid,
        userEmail: adminEmail,
        action: 'ADVANCED_DATABASE_ZERO_AND_RESET',
        details: {
          deletedSummary: `Deleted ${stats.totalDeleted} records (${stats.bookingsDeleted} bookings, ${stats.transactionsDeleted + stats.walletTransactionsDeleted} transactions, ${stats.messagesDeleted} chats, ${stats.whatsappLogsDeleted} WhatsApp logs, ${stats.reviewsDeleted} reviews).`,
          updatedSummary: `Updated ${stats.totalUpdated} records (${stats.walletsReset} wallets, ${stats.techniciansUpdated} technicians, ${stats.bookingsUpdated} bookings status).`,
          settingsReset: stats.settingsReset,
        },
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    onProgress?.('सभी चुने गए ऑपरेशन्स सफलतापूर्वक पूरे हुए!', 100);
    return stats;
  } catch (error) {
    console.error('Error in executeAdvancedDataOperations:', error);
    throw error;
  }
}

/**
 * Backward compatibility wrapper for zeroOutPlatformData
 */
export async function zeroOutPlatformData(options: ZeroOutOptions): Promise<ZeroOutStats> {
  const advancedResult = await executeAdvancedDataOperations({
    deleteOptions: {
      bookings: options.deleteBookings ?? true,
      bookingsFilter: 'ALL',
      transactions: options.deleteTransactions ?? true,
      transactionsFilter: 'ALL',
      messages: options.deleteLogsAndMessages ?? true,
      whatsappLogs: options.deleteLogsAndMessages ?? true,
      notifications: options.deleteLogsAndMessages ?? true,
      reviews: options.deleteReviews ?? true,
      kycDocuments: options.deleteKycApplications ?? true,
      franchiseApplications: false,
      bulkCampaigns: false,
      passwordResetRequests: false,
      auditLogs: false,
    },
    updateOptions: {
      resetWallets: options.resetWalletsToZero ?? true,
      walletTargetBalance: 0,
      resetWalletPendingBalance: true,
      resetWalletLifetimeEarnings: true,
      resetTechnicians: false,
      techniciansSetOffline: false,
      techniciansResetJobsCounter: false,
      techniciansResetRatingToDefault: false,
      updateBookingsStatus: false,
      bookingsTargetStatus: 'CANCEL_PENDING',
      resetPlatformSettings: false,
    },
    adminEmail: options.adminEmail,
    adminUid: options.adminUid,
    onProgress: options.onProgress,
  });

  return {
    bookingsDeleted: advancedResult.bookingsDeleted,
    transactionsDeleted: advancedResult.transactionsDeleted,
    walletTransactionsDeleted: advancedResult.walletTransactionsDeleted,
    notificationsDeleted: advancedResult.notificationsDeleted,
    whatsappLogsDeleted: advancedResult.whatsappLogsDeleted,
    messagesDeleted: advancedResult.messagesDeleted,
    reviewsDeleted: advancedResult.reviewsDeleted,
    kycDocsDeleted: advancedResult.kycDocsDeleted,
    walletsReset: advancedResult.walletsReset,
    totalDeleted: advancedResult.totalDeleted,
  };
}

