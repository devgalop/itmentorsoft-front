export interface UserInfo {
  user_id: string;
  username: string;
  email: string;
  role: string;
}

export interface GetUserResponse {
  is_success: boolean;
  message: string;
  user: UserInfo | null;
}

export interface GetAvailableRolesResponse {
  is_success: boolean;
  roles: string[];
}

export interface AssignRoleResponse {
  is_success: boolean;
  message: string;
}

export interface CreateUserPayload {
  email: string;
  username: string;
  role: string;
}

export interface CreateUserResponse {
  is_success: boolean;
  message: string;
  user_id?: string | null;
}
