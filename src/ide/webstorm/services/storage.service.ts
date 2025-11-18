import { IStorageService, TokenData } from '../../../shared/types';

// IntelliJ Platform API types (упрощенные)
declare const com: any;
declare const java: any;

export class WebStormStorageService implements IStorageService {
    private readonly ACCESS_TOKEN_KEY = 'i18nRemote.accessToken';
    private readonly REFRESH_TOKEN_KEY = 'i18nRemote.refreshToken';
    private readonly REFRESH_EXPIRES_IN_KEY = 'i18nRemote.refreshExpiresIn';

    private getProperties(): any {
        // Используем PropertiesComponent для хранения данных
        // @ts-ignore
        return com.intellij.ide.util.PropertiesComponent.getInstance();
    }

    async getAccessToken(): Promise<string | undefined> {
        try {
            const props = this.getProperties();
            const value = props.getValue(this.ACCESS_TOKEN_KEY);
            return value || undefined;
        } catch (error) {
            console.error('Error getting access token:', error);
            return undefined;
        }
    }

    async getRefreshToken(): Promise<string | undefined> {
        try {
            const props = this.getProperties();
            const value = props.getValue(this.REFRESH_TOKEN_KEY);
            return value || undefined;
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return undefined;
        }
    }

    async getRefreshExpiresIn(): Promise<number | undefined> {
        try {
            const props = this.getProperties();
            const value = props.getValue(this.REFRESH_EXPIRES_IN_KEY);
            return value ? parseInt(value, 10) : undefined;
        } catch (error) {
            console.error('Error getting refresh expires in:', error);
            return undefined;
        }
    }

    async getToken(): Promise<string | undefined> {
        return await this.getAccessToken();
    }

    async saveTokens(authResponse: TokenData): Promise<void> {
        try {
            const props = this.getProperties();
            props.setValue(this.ACCESS_TOKEN_KEY, authResponse.access_token);
            props.setValue(this.REFRESH_TOKEN_KEY, authResponse.refresh_token);
            props.setValue(this.REFRESH_EXPIRES_IN_KEY, authResponse.refresh_expires_in.toString());
        } catch (error) {
            console.error('Error saving tokens:', error);
            throw error;
        }
    }

    async saveToken(token: string): Promise<void> {
        try {
            const props = this.getProperties();
            props.setValue(this.ACCESS_TOKEN_KEY, token);
        } catch (error) {
            console.error('Error saving token:', error);
            throw error;
        }
    }

    async deleteTokens(): Promise<void> {
        try {
            const props = this.getProperties();
            props.unsetValue(this.ACCESS_TOKEN_KEY);
            props.unsetValue(this.REFRESH_TOKEN_KEY);
            props.unsetValue(this.REFRESH_EXPIRES_IN_KEY);
        } catch (error) {
            console.error('Error deleting tokens:', error);
            throw error;
        }
    }

    async deleteToken(): Promise<void> {
        await this.deleteTokens();
    }
}
