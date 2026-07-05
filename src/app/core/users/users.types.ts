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
