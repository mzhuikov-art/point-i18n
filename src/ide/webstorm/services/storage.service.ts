import { IStorageService, TokenData } from '../../shared/types';

export class WebStormStorageService implements IStorageService {
    private readonly ACCESS_TOKEN_KEY = 'i18nRemote.accessToken';
    private readonly REFRESH_TOKEN_KEY = 'i18nRemote.refreshToken';
    private readonly REFRESH_EXPIRES_IN_KEY = 'i18nRemote.refreshExpiresIn';

    async getAccessToken(): Promise<string | undefined> {
        // TODO: Implement WebStorm storage API
        return undefined;
    }

    async getRefreshToken(): Promise<string | undefined> {
        // TODO: Implement WebStorm storage API
        return undefined;
    }

    async getRefreshExpiresIn(): Promise<number | undefined> {
        // TODO: Implement WebStorm storage API
        return undefined;
    }

    async getToken(): Promise<string | undefined> {
        return await this.getAccessToken();
    }

    async saveTokens(authResponse: TokenData): Promise<void> {
        // TODO: Implement WebStorm storage API
    }

    async saveToken(token: string): Promise<void> {
        // TODO: Implement WebStorm storage API
    }

    async deleteTokens(): Promise<void> {
        // TODO: Implement WebStorm storage API
    }

    async deleteToken(): Promise<void> {
        await this.deleteTokens();
    }
}

