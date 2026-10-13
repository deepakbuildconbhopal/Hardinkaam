import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { JobPost } from '../types/workAndJobs';

export interface JobSocialLinksConfig {
  facebookUrl: string;
  linkedInUrl: string;
  whatsAppNumberOrUrl: string;
  instagramUrl: string;
  telegramUrl: string;
  twitterUrl: string;
  companyWebsite: string;
  updatedAt: string;
}

const DEFAULT_LINKS: JobSocialLinksConfig = {
  facebookUrl: 'https://facebook.com/hardinkaam',
  linkedInUrl: 'https://linkedin.com/company/hardinkaam',
  whatsAppNumberOrUrl: 'https://wa.me/916267546945',
  instagramUrl: 'https://instagram.com/hardinkaam',
  telegramUrl: 'https://t.me/hardinkaam',
  twitterUrl: 'https://x.com/hardinkaam',
  companyWebsite: 'https://www.hardinkaam.online',
  updatedAt: new Date().toISOString()
};

export const jobSocialService = {
  /**
   * Fetches saved social media links from Firestore or returns default links.
   */
  async getSavedSocialLinks(): Promise<JobSocialLinksConfig> {
    try {
      const docRef = doc(db, 'job_social_links', 'config');
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return DEFAULT_LINKS;
      }
      return { ...DEFAULT_LINKS, ...snap.data() } as JobSocialLinksConfig;
    } catch (e) {
      console.warn('[JobSocialService] Fetch notice, returning default links:', e);
      return DEFAULT_LINKS;
    }
  },

  /**
   * Saves updated social media links to Firestore so they persist for all job postings.
   */
  async saveSocialLinks(links: Partial<JobSocialLinksConfig>): Promise<void> {
    try {
      const docRef = doc(db, 'job_social_links', 'config');
      await setDoc(docRef, {
        ...links,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('[JobSocialService] Error saving social links:', e);
      throw e;
    }
  },

  /**
   * Generates a ready-to-share message text for a job post with the saved social media profile link attached.
   */
  buildJobShareText(job: JobPost, links: JobSocialLinksConfig, platform: string): string {
    const title = job.title;
    const salary = job.salaryRange || 'Attractive Salary / आकर्षक वेतन';
    const location = job.location || 'Bhopal, MP';
    const web = links.companyWebsite || 'https://www.hardinkaam.online';
    const wa = links.whatsAppNumberOrUrl || 'https://wa.me/916267546945';

    let text = `💼 HARDINKAAM JOB OPENING 💼\n\n`;
    text += `📌 Position: ${title}\n`;
    text += `📍 Location: ${location}\n`;
    text += `💰 Salary: ${salary}\n`;
    text += `👥 Openings: ${job.openings || 5}\n\n`;
    text += `📝 Details: ${job.hindiContent || job.englishContent || 'Apply now on Hardinkaam Portal'}\n\n`;
    text += `🌐 Apply Online: ${web}/#jobs\n`;
    text += `📱 Contact WhatsApp: ${wa}\n\n`;

    if (platform === 'facebook' && links.facebookUrl) {
      text += `Facebook Page: ${links.facebookUrl}\n`;
    }
    if (platform === 'linkedin' && links.linkedInUrl) {
      text += `LinkedIn Page: ${links.linkedInUrl}\n`;
    }
    if (platform === 'instagram' && links.instagramUrl) {
      text += `Instagram: ${links.instagramUrl}\n`;
    }

    text += `#JobsInBhopal #Hardinkaam #Hiring #Employment`;
    return text;
  },

  /**
   * Builds direct launch URL for social media platforms.
   */
  getSocialShareUrl(platform: 'whatsapp' | 'facebook' | 'linkedin' | 'twitter' | 'telegram', text: string, url: string): string {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);

    switch (platform) {
      case 'whatsapp':
        return `https://wa.me/?text=${encodedText}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedText}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
      default:
        return `https://wa.me/?text=${encodedText}`;
    }
  }
};
