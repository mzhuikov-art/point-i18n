import * as vscode from 'vscode';

export const authUrl = `https://esb-superadmin-backend-dev.kapitalbank.uz/api/v1/proxy/realms/auth/protocol/openid-connect/token`;

export const SUPPORTED_LOCALES = ['ru', 'en', 'uz'];

export const getProjectsUrl = (): string => {
    return 'https://esb-superadmin-backend-dev.kapitalbank.uz/api/v1/proxy/localization/api/localization-project?pageSize=100';
};

export function getFetchLocalesUrl(locale: string, projectKey: string): string {
    return `https://localization-api.kapitalbank.uz/api/v1/localization/${projectKey}/language/${locale}`;
}

export function getCreateKeyUrl(projectKey: string): string {
    return `https://esb-superadmin-backend-dev.kapitalbank.uz/api/v1/proxy/localization/api/localization/${projectKey}/new`;
}

export function getUpdateKeyUrl(projectKey: string): string {
    return `https://esb-superadmin-backend-dev.kapitalbank.uz/api/v1/proxy/localization/api/localization/${projectKey}`;
}

export function getSearchKeysUrl(projectKey: string): string {
    return `https://esb-superadmin-backend-dev.kapitalbank.uz/api/v1/proxy/localization/api/localization/${projectKey}`;
}

export const supportedLanguages: vscode.DocumentFilter[] = [
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascriptreact' },
    { scheme: 'file', language: 'typescriptreact' },
    { scheme: 'file', language: 'vue' },        // Volar
    { scheme: 'file', language: 'vue-html' },   // template
    { scheme: 'file', language: 'html' }
  ];