import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_status: 'free' | 'pro' | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_status?: 'free' | 'pro' | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_status?: 'free' | 'pro' | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      columns: {
        Row: {
          id: string;
          name: string;
          project_id: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          project_id: string;
          position: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          project_id?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          column_id: string;
          position: number;
          priority: 'low' | 'medium' | 'high';
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          column_id: string;
          position: number;
          priority?: 'low' | 'medium' | 'high';
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          column_id?: string;
          position?: number;
          priority?: 'low' | 'medium' | 'high';
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
  project_members: {
    Row: {
      id: string;
      project_id: string;
      user_id: string;
      role: 'owner' | 'admin' | 'member';
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      project_id: string;
      user_id: string;
      role?: 'owner' | 'admin' | 'member';
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      project_id?: string;
      user_id?: string;
      role?: 'owner' | 'admin' | 'member';
      created_at?: string;
      updated_at?: string;
    };
  };
  task_comments: {
    Row: {
      id: string;
      task_id: string;
      user_id: string;
      content: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      task_id: string;
      user_id: string;
      content: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      task_id?: string;
      user_id?: string;
      content?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  activity_logs: {
    Row: {
      id: string;
      project_id: string;
      user_id: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      details: any;
      created_at: string;
    };
    Insert: {
      id?: string;
      project_id: string;
      user_id: string;
      action: string;
      entity_type: string;
      entity_id?: string | null;
      details?: any;
      created_at?: string;
    };
    Update: {
      id?: string;
      project_id?: string;
      user_id?: string;
      action?: string;
      entity_type?: string;
      entity_id?: string | null;
      details?: any;
      created_at?: string;
    };
  };
  notifications: {
    Row: {
      id: string;
      user_id: string;
      title: string;
      message: string;
      type: string;
      read: boolean;
      data: any;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      title: string;
      message: string;
      type: string;
      read?: boolean;
      data?: any;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      title?: string;
      message?: string;
      type?: string;
      read?: boolean;
      data?: any;
      created_at?: string;
    };
  };
  bookmarks: {
    Row: {
      id: string;
      user_id: string;
      project_id: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      project_id: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      project_id?: string;
      created_at?: string;
    };
  };
};