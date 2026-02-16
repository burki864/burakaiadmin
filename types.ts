
export interface UserProfile {
  id: string;
  username: string;
  full_name?: string; // New field for real names
  email: string;
  avatar_url?: string;
  banned: boolean;
  banned_until: string | null;
  reason?: string; 
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
  action_type: 'BAN' | 'UNBAN' | 'DELETE_MESSAGE' | 'UPDATE_SETTINGS' | 'LOGIN' | 'DELETE_USER';
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
