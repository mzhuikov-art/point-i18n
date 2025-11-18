import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { getAuthUrl, getFetchLocalesUrl, getCreateKeyUrl, getUpdateKeyUrl, getSearchKeysUrl, getProjectsUrl, getUserInfoUrl } from '../constants';
import { AuthRequest, AuthResponse, AuthErrorResponse, FetchLocalesResponse, CreateKeyRequest, CreateKeyResponse, CreateKeyErrorResponse, UpdateKeyResponse, SearchKeysResponse, ProjectsResponse } from './api.service.types';
import { StorageService } from './storage.service';

export class ApiService {
    private readonly CLIENT_ID = 'auth-client';
    private readonly CLIENT_SECRET = '77X6lydjx3beOw3rcgQ6fwMK6t2tatFo';
    private readonly GRANT_TYPE_PASSWORD = 'password';
    private readonly GRANT_TYPE_REFRESH = 'refresh_token';
    private readonly SCOPE = 'openid';
    private storageService?: StorageService;
    private isRefreshing = false;
    private refreshPromise: Promise<AuthResponse | null> | null = null;

    constructor(storageService?: StorageService) {
        this.storageService = storageService;
    }

    async authenticate(username: string, password: string): Promise<AuthResponse> {
        const formBody = this.buildAuthBody(username, password);
        
        const res = await fetch(await getAuthUrl(), {
            headers: {
                "endpoint": "KC_AUTH",
                "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: formBody.toString(),
            method: "POST"
        });

        if (!res.ok) {
            try {
                const errorData: AuthErrorResponse = await res.json();
                const errorMessage = errorData.error_description || errorData.error || 'Ошибка авторизации';
                throw new Error(errorMessage);
            } catch (parseError) {
                if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
                    throw parseError;
                }
                throw new Error(`Ошибка авторизации: ${res.status} ${res.statusText}`);
            }
        }

        const data: AuthResponse = await res.json();
        return data;
    }

    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        const params = new URLSearchParams();
        params.append('grant_type', this.GRANT_TYPE_REFRESH);
        params.append('refresh_token', refreshToken);
        params.append('client_id', this.CLIENT_ID);
        params.append('client_secret', this.CLIENT_SECRET);

        const res = await fetch(await getAuthUrl(), {
            headers: {
                "endpoint": "KC_AUTH",
                "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: params.toString(),
            method: "POST"
        });

        if (!res.ok) {
            try {
                const errorData: AuthErrorResponse = await res.json();
                const errorMessage = errorData.error_description || errorData.error || 'Ошибка обновления токена';
                throw new Error(errorMessage);
            } catch (parseError) {
                if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
                    throw parseError;
                }
                throw new Error(`Ошибка обновления токена: ${res.status} ${res.statusText}`);
            }
        }

        const data: AuthResponse = await res.json();
        return data;
    }

    async getUserInfo(token: string): Promise<any> {
        const url = await getUserInfoUrl();
        const res = await fetch(url, {
            headers: {
                'authorization': `Bearer ${token}`,
            },
            method: 'GET'
        });

        if (!res.ok) {
            throw new Error(`Failed to get user info: ${res.status}`);
        }

        return await res.json();
    }

    private async ensureValidToken(): Promise<string> {
        if (!this.storageService) {
            throw new Error('StorageService не настроен');
        }

        const accessToken = await this.storageService.getAccessToken();
        if (!accessToken) {
            throw new Error('Токен не найден');
        }

        return accessToken;
    }

    private async refreshTokenIfNeeded(): Promise<string> {
        if (!this.storageService) {
            throw new Error('StorageService не настроен');
        }

        if (this.isRefreshing && this.refreshPromise) {
            const result = await this.refreshPromise;
            if (result) {
                return result.access_token;
            }
            throw new Error('Не удалось обновить токен');
        }

        this.isRefreshing = true;
        this.refreshPromise = (async () => {
            try {
                const refreshToken = await this.storageService!.getRefreshToken();
                if (!refreshToken) {
                    await this.storageService!.deleteTokens();
                    throw new Error('Refresh token не найден');
                }

                const authResponse = await this.refreshToken(refreshToken);
                await this.storageService!.saveTokens(authResponse);
                return authResponse;
            } catch (error) {
                await this.storageService!.deleteTokens();
                throw error;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        const result = await this.refreshPromise;
        if (result) {
            return result.access_token;
        }
        throw new Error('Не удалось обновить токен');
    }

    private async makeRequestWithTokenRefresh<T>(
        requestFn: (token: string) => Promise<T>
    ): Promise<T> {
        let token = await this.ensureValidToken();

        try {
            return await requestFn(token);
        } catch (error: any) {
            if (error.status === 401 || (error.message && error.message.includes('401'))) {
                token = await this.refreshTokenIfNeeded();
                return await requestFn(token);
            }
            throw error;
        }
    }

    async fetchProjects(token?: string): Promise<ProjectsResponse> {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.fetchProjects(t));
        }

        const actualToken = token || await this.ensureValidToken();
        const url = await getProjectsUrl();
        const res = await fetch(url, {
            headers: {
                'authorization': `Bearer ${actualToken}`,
            },
            method: 'GET'
        });

        if (!res.ok) {
            const error = new Error(`Failed to fetch projects: ${res.status}`);
            (error as any).status = res.status;
            throw error;
        }

        const data: ProjectsResponse = await res.json();
        return data;
    }

    async fetchLocales(token: string | undefined, locale: string, projectKey: string): Promise<Record<string, string>> {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.fetchLocales(t, locale, projectKey));
        }

        const actualToken = token || await this.ensureValidToken();
        const url = await getFetchLocalesUrl(locale, projectKey);
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${actualToken}`
            }
        });

        if (!res.ok) {
            const error = new Error(`Failed to fetch locales for ${locale}: ${res.status}`);
            (error as any).status = res.status;
            throw error;
        }

        const data: FetchLocalesResponse = await res.json();
        return data.data;
    }

    async createKey(token: string | undefined, request: CreateKeyRequest, projectKey: string): Promise<CreateKeyResponse> {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.createKey(t, request, projectKey));
        }

        const actualToken = token || await this.ensureValidToken();
        const url = await getCreateKeyUrl(projectKey);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${actualToken}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        console.log(url)
        console.log(JSON.stringify(request))

        const data = await res.json();

        if (!res.ok || 'message' in data) {
            const error = data as CreateKeyErrorResponse;
            if (error.message.includes('duplicate key')) {
                throw new Error('Ключ уже существует');
            }
            const err = new Error(error.message || `Failed to create key: ${res.status}`);
            (err as any).status = res.status;
            throw err;
        }

        return data as CreateKeyResponse;
    }

    async updateKey(token: string | undefined, request: CreateKeyRequest, projectKey: string): Promise<UpdateKeyResponse> {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.updateKey(t, request, projectKey));
        }

        const actualToken = token || await this.ensureValidToken();
        const url = await getUpdateKeyUrl(projectKey);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${actualToken}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        const text = await res.text();
        
        if (!text || text.trim().length === 0) {
            if (res.ok) {
                return {
                    data: {
                        key: request.key,
                        translations: request.translations
                    }
                };
            }
            const err = new Error(`Failed to update key: ${res.status} (empty response)`);
            (err as any).status = res.status;
            throw err;
        }

        let data: any;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }

        if (!res.ok || 'message' in data) {
            const error = data as CreateKeyErrorResponse;
            const err = new Error(error.message || `Failed to update key: ${res.status}`);
            (err as any).status = res.status;
            throw err;
        }

        return data as UpdateKeyResponse;
    }

    async searchKeys(token: string | undefined, search: string, projectKey: string, pageNumber: number = 1, pageSize: number = 10): Promise<SearchKeysResponse> {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.searchKeys(t, search, projectKey, pageNumber, pageSize));
        }

        const actualToken = token || await this.ensureValidToken();
        const params = new URLSearchParams();
        params.append('pageNumber', pageNumber.toString());
        params.append('pageSize', pageSize.toString());
        if (search && search.trim()) {
            params.append('search', search.trim());
        }

        const url = `${await getSearchKeysUrl(projectKey)}?${params.toString()}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${actualToken}`,
            }
        });

        if (!res.ok) {
            const error = new Error(`Failed to search keys: ${res.status}`);
            (error as any).status = res.status;
            throw error;
        }

        const data = await res.json();
        return data as SearchKeysResponse;
    }

    private buildAuthBody(username: string, password: string): URLSearchParams {
        const req: AuthRequest = {
            username,
            password,
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
            grant_type: this.GRANT_TYPE_PASSWORD,
            scope: this.SCOPE
        };

        const params = new URLSearchParams();
        params.append('username', req.username);
        params.append('password', req.password);
        params.append('client_id', req.client_id);
        params.append('client_secret', req.client_secret);
        params.append('grant_type', req.grant_type);
        params.append('scope', req.scope);
        
        return params;
    }
}

