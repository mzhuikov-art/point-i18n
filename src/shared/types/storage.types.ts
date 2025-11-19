export interface TokenData {
    access_token: string;
    refresh_token: string;
    refresh_expires_in: number;
}

export interface IStorageService {
    getAccessToken(): Promise<string | undefined>;
    getRefreshToken(): Promise<string | undefined>;
    getRefreshExpiresIn(): Promise<number | undefined>;
    getToken(): Promise<string | undefined>;
    saveTokens(authResponse: TokenData): Promise<void>;
    saveToken(token: string): Promise<void>;
    deleteTokens(): Promise<void>;
    deleteToken(): Promise<void>;
}

