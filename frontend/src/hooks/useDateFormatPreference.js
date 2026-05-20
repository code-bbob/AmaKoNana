/**
 * Hook for managing date format preference from enterprise
 * Fetches preference from enterprise configuration
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';

/**
 * Hook to get and manage enterprise's date format preference
 * Automatically fetches from the user's enterprise
 */
export function useDateFormatPreference() {
  const [dateFormat, setDateFormat] = useState(getDateFormatPreference());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enterpriseId, setEnterpriseId] = useState(null);

  const resolveEnterpriseId = (userInfo) => {
    const rawEnterprise = userInfo?.enterprise;

    if (typeof rawEnterprise === 'number') {
      return rawEnterprise;
    }

    if (rawEnterprise && typeof rawEnterprise === 'object' && typeof rawEnterprise.id === 'number') {
      return rawEnterprise.id;
    }

    const nestedEnterprise = userInfo?.employee?.enterprise?.id;
    if (typeof nestedEnterprise === 'number') {
      return nestedEnterprise;
    }

    return null;
  };

  useEffect(() => {
    const loadPreference = async () => {
      try {
        setLoading(true);
        console.debug('[date-format] loadPreference:start');
        
        // Get current user info to find their enterprise
        const userInfo = await apiClient.auth.getCurrentUser();
        console.debug('[date-format] loadPreference:user-info', userInfo);
        
        const resolvedEnterpriseId = resolveEnterpriseId(userInfo);

        if (!resolvedEnterpriseId) {
          console.warn('No enterprise found for user');
          console.debug('[date-format] loadPreference:no-enterprise');
          setDateFormat(getDateFormatPreference());
          setLoading(false);
          return;
        }

        setEnterpriseId(resolvedEnterpriseId);
        const cachedFormat = localStorage.getItem(`enterpriseDateFormat_${resolvedEnterpriseId}`);
        if (cachedFormat === 'ad' || cachedFormat === 'bs') {
          console.debug('[date-format] loadPreference:cached', {
            enterpriseId: resolvedEnterpriseId,
            cachedFormat,
          });
          setDateFormat(cachedFormat);
        }
        
        // Fetch enterprise hierarchy which includes date_format_preference
        const response = await apiClient.enterprise.hierarchy();
        const enterprises = response.enterprises || [];
        const enterprise = enterprises.find((e) => e.id === resolvedEnterpriseId);
        
        if (enterprise?.date_format_preference) {
          console.debug('[date-format] loadPreference:fetched', {
            enterpriseId: enterprise.id,
            dateFormat: enterprise.date_format_preference,
          });
          setDateFormat(enterprise.date_format_preference);
          // Cache in localStorage
          localStorage.setItem(`enterpriseDateFormat_${enterprise.id}`, enterprise.date_format_preference);
          localStorage.setItem('dateFormatPreference', enterprise.date_format_preference);
        } else {
          console.debug('[date-format] loadPreference:missing-preference-falling-back-to-ad');
          setDateFormat(getDateFormatPreference());
        }
      } catch (err) {
        console.warn('Failed to load enterprise date format preference, using default:', err);
        console.debug('[date-format] loadPreference:error-fallback-ad', err);
        setDateFormat(getDateFormatPreference());
      } finally {
        setLoading(false);
        console.debug('[date-format] loadPreference:done');
      }
    };

    loadPreference();
  }, []);

  const updatePreference = async (newFormat) => {
    if (!enterpriseId) {
      setError('No enterprise found');
      console.debug('[date-format] updatePreference:no-enterprise-id', { newFormat });
      return false;
    }

    try {
      console.debug('[date-format] updatePreference:start', { enterpriseId, newFormat });
      
      // Update enterprise date format preference
      await apiClient.enterprise.updatePreference(enterpriseId, {
        date_format_preference: newFormat,
      });

      setDateFormat(newFormat);
      // Update localStorage cache
      localStorage.setItem(`enterpriseDateFormat_${enterpriseId}`, newFormat);
      localStorage.setItem('dateFormatPreference', newFormat);
      console.debug('[date-format] updatePreference:success', { enterpriseId, newFormat });
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.debug('[date-format] updatePreference:error', { enterpriseId, newFormat, errorMsg });
      return false;
    }
  };

  return {
    dateFormat,
    loading,
    error,
    enterpriseId,
    updatePreference,
  };
}

/**
 * Get user's current date format without side effects
 * Uses localStorage as fallback, defaults to 'ad'
 */
export function getDateFormatPreference() {
  if (typeof window === 'undefined') return 'ad';

  const stored = localStorage.getItem('dateFormatPreference');
  if (stored === 'ad' || stored === 'bs') {
    return stored;
  }

  return 'ad';
}

/**
 * Set date format preference in localStorage
 */
export function setDateFormatPreference(format) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dateFormatPreference', format);
  }
}
