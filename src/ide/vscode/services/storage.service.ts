import * as vscode from 'vscode';
import { IStorageService, TokenData } from '../../../shared/types';

export class VSCodeStorageService implements IStorageService {
    private readonly ACCESS_TOKEN_KEY = 'i18nRemote.accessToken';
    private readonly REFRESH_TOKEN_KEY = 'i18nRemote.refreshToken';
    private readonly REFRESH_EXPIRES_IN_KEY = 'i18nRemote.refreshExpiresIn';
    private secretStorage: vscode.SecretStorage;

    constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
    }

    async getAccessToken(): Promise<string | undefined> {
        return await this.secretStorage.get(this.ACCESS_TOKEN_KEY);
    }

    async getRefreshToken(): Promise<string | undefined> {
        return await this.secretStorage.get(this.REFRESH_TOKEN_KEY);
    }

    async getRefreshExpiresIn(): Promise<number | undefined> {
        const value = await this.secretStorage.get(this.REFRESH_EXPIRES_IN_KEY);
        return value ? parseInt(value, 10) : undefined;
    }

    async getToken(): Promise<string | undefined> {
        return await this.getAccessToken();
    }

    async saveTokens(authResponse: TokenData): Promise<void> {
        await this.secretStorage.store(this.ACCESS_TOKEN_KEY, authResponse.access_token);
        await this.secretStorage.store(this.REFRESH_TOKEN_KEY, authResponse.refresh_token);
        await this.secretStorage.store(this.REFRESH_EXPIRES_IN_KEY, authResponse.refresh_expires_in.toString());
    }

    async saveToken(token: string): Promise<void> {
        await this.secretStorage.store(this.ACCESS_TOKEN_KEY, token);
    }

    async deleteTokens(): Promise<void> {
        await this.secretStorage.delete(this.ACCESS_TOKEN_KEY);
        await this.secretStorage.delete(this.REFRESH_TOKEN_KEY);
        await this.secretStorage.delete(this.REFRESH_EXPIRES_IN_KEY);
    }

    async deleteToken(): Promise<void> {
        await this.deleteTokens();
    }
}

