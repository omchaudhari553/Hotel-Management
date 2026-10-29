export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  data?: null;
  timestamp?: string;
  errors?: Record<string, string>;
}
