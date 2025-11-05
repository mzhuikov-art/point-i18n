import * as vscode from 'vscode';

export class StorageService {
    private readonly SECRET_KEY = 'i18nRemote.token';
    private secretStorage: any;

    constructor(context: vscode.ExtensionContext) {
        //@ts-ignore
        this.secretStorage = context.secrets;
    }

    async getToken(): Promise<string | undefined> {
        return await this.secretStorage.get(this.SECRET_KEY);
    }

    async saveToken(token: string): Promise<void> {
        await this.secretStorage.store(this.SECRET_KEY, token);
    }

    async deleteToken(): Promise<void> {
        await this.secretStorage.delete(this.SECRET_KEY);
    }
}

