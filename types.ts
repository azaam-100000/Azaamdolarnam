
export interface GeneratedAccount {
  id: string;
  email: string;
  password_plain: string;
  password_md5: string;
  created_at: string;
  user_id?: string;
}

export interface GameState {
  user_id: string;
  current_index: number;
  current_level: number;
  updated_at?: string;
}
