/**
 * Format ISO date string into readable date & time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'Unscheduled';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Format date only
 */
export const formatDateOnly = (dateString) => {
  if (!dateString) return 'No date';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format time only (e.g. 10:30 AM)
 */
export const formatTimeOnly = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Format minutes into readable duration (e.g., "1 hr 15 mins")
 */
export const formatDuration = (minutes = 0) => {
  if (minutes < 1) return '< 1 min';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
};

/**
 * Format seconds into meeting timer format (MM:SS or HH:MM:SS)
 */
export const formatTimer = (totalSeconds) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
};

/**
 * Get user initials from name
 */
export const getInitials = (name = 'User') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/**
 * Worldwide Public Tunnel URL (Cloudflare Tunnel)
 * Ensures valid SSL/HTTPS for mobile camera/microphone permissions and connects across any network
 */
export const PUBLIC_TUNNEL_URL = 'https://minerals-advice-buck-assessments.trycloudflare.com';
export const LAN_IP_URL = 'http://192.168.29.146:5173';

/**
 * Resolves the primary shareable meeting link.
 * If the host is on localhost, it generates the Worldwide Secure Link so external phones & attendees can join with camera & mic enabled.
 */
export const getShareableMeetingLink = (meetingCodeOrId) => {
  if (typeof window === 'undefined') return `/room/${meetingCodeOrId}`;
  const hostname = window.location.hostname;

  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    if (PUBLIC_TUNNEL_URL) {
      return `${PUBLIC_TUNNEL_URL}/room/${meetingCodeOrId}`;
    }
    return `${LAN_IP_URL}/room/${meetingCodeOrId}`;
  }

  return `${window.location.origin}/room/${meetingCodeOrId}`;
};

/**
 * Resolves the Worldwide Secure Public Tunnel Link
 */
export const getTunnelMeetingLink = (meetingCodeOrId) => {
  return `${PUBLIC_TUNNEL_URL}/room/${meetingCodeOrId}`;
};

/**
 * Resolves the Local Wi-Fi Network Link
 */
export const getWifiMeetingLink = (meetingCodeOrId) => {
  return `${LAN_IP_URL}/room/${meetingCodeOrId}`;
};

/**
 * Resolves the exact local meeting link (this computer only)
 */
export const getLocalMeetingLink = (meetingCodeOrId) => {
  if (typeof window === 'undefined') return `/room/${meetingCodeOrId}`;
  return `${window.location.origin}/room/${meetingCodeOrId}`;
};
