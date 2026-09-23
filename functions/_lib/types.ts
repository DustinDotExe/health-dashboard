export type AuthRecord = {
  refreshToken: string;
  scope?: string;
  tokenType?: string;
};

export type AuthStore = {
  get(key: string, type: "json"): Promise<AuthRecord | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

export type HealthdashEnv = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  HEALTHDASH_AUTH?: AuthStore;
};
