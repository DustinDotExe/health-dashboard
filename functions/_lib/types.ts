export type AuthRecord = {
  refreshToken: string;
  scope?: string;
  tokenType?: string;
};

export type AuthStore = {
  get(key: string, type: "json"): Promise<AuthRecord | null>;
  get(key: string, type: "text"): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
};

export type HealthdashEnv = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  HEALTHDASH_TIME_ZONE?: string;
  HEALTHDASH_AUTH?: AuthStore;
};
