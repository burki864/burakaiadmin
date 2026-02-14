
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  banned: boolean;
  ban_until: string | null;
  created_at: string;
  status?: 'online' | 'offline';
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: UserProfile;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action_type: 'BAN' | 'UNBAN' | 'DELETE_MESSAGE' | 'UPDATE_SETTINGS' | 'LOGIN';
  target_user_id?: string;
  details: string;
  created_at: string;
  target_user?: UserProfile;
}

export enum DashboardTab {
  OVERVIEW = 'overview',
  USERS = 'users',
  MESSAGES = 'messages',
  LOGS = 'logs',
  SETTINGS = 'settings'
}
