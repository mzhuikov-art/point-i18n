import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { getAuthUrl, getFetchLocalesUrl, getCreateKeyUrl, getUpdateKeyUrl, getSearchKeysUrl, getProjectsUrl } from '../constants';
import { AuthRequest, AuthResponse, AuthErrorResponse, FetchLocalesResponse, CreateKeyRequest, CreateKeyResponse, CreateKeyErrorResponse, UpdateKeyResponse, SearchKeysResponse, ProjectsResponse } from './api.service.types';

export class ApiService {
    private readonly CLIENT_ID = 'auth-client';
    private readonly CLIENT_SECRET = '77X6lydjx3beOw3rcgQ6fwMK6t2tatFo';
    private readonly GRANT_TYPE = 'password';
    private readonly SCOPE = 'openid';

    async authenticate(username: string, password: string): Promise<string | null> {
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
        return data.access_token ?? null;
    }

    async fetchProjects(token: string): Promise<ProjectsResponse> {
        const url = await getProjectsUrl();
        const res = await fetch(url, {
            headers: {
                'authorization': `Bearer ${token}`,
            },
            method: 'GET'
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch projects: ${res.status}`);
        }

        const data: ProjectsResponse = await res.json();
        return data;
    }

    async fetchLocales(token: string, locale: string, projectKey: string): Promise<Record<string, string>> {
        const url = await getFetchLocalesUrl(locale, projectKey);
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch locales for ${locale}: ${res.status}`);
        }

        const data: FetchLocalesResponse = await res.json();
        return data.data;
    }

    async createKey(token: string, request: CreateKeyRequest, projectKey: string): Promise<CreateKeyResponse> {
        const url = await getCreateKeyUrl(projectKey);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${token}`,
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
            throw new Error(error.message || `Failed to create key: ${res.status}`);
        }

        return data as CreateKeyResponse;
    }

    async updateKey(token: string, request: CreateKeyRequest, projectKey: string): Promise<UpdateKeyResponse> {
        const url = await getUpdateKeyUrl(projectKey);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${token}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        const text = await res.text();
        
        if (!text || text.trim().length === 0) {
            if (res.ok) {
                // Если ответ успешный но пустой, возвращаем данные из запроса
                return {
                    data: {
                        key: request.key,
                        translations: request.translations
                    }
                };
            }
            throw new Error(`Failed to update key: ${res.status} (empty response)`);
        }

        let data: any;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }

        if (!res.ok || 'message' in data) {
            const error = data as CreateKeyErrorResponse;
            throw new Error(error.message || `Failed to update key: ${res.status}`);
        }

        return data as UpdateKeyResponse;
    }

    async searchKeys(token: string, search: string, projectKey: string, pageNumber: number = 1, pageSize: number = 10): Promise<SearchKeysResponse> {
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
                'authorization': `Bearer ${token}`,
            }
        });

        if (!res.ok) {
            throw new Error(`Failed to search keys: ${res.status}`);
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
            grant_type: this.GRANT_TYPE,
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

