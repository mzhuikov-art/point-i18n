"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const url_1 = require("url");
class ApiService {
    constructor(configService, storageService) {
        this.CLIENT_ID = 'auth-client';
        this.CLIENT_SECRET = '77X6lydjx3beOw3rcgQ6fwMK6t2tatFo';
        this.GRANT_TYPE_PASSWORD = 'password';
        this.GRANT_TYPE_REFRESH = 'refresh_token';
        this.SCOPE = 'openid';
        this.isRefreshing = false;
        this.refreshPromise = null;
        this.configService = configService;
        this.storageService = storageService;
    }
    async getAuthUrl() {
        const baseUrl = await this.configService.getApiBaseUrl();
        return `${baseUrl}/api/v1/proxy/realms/auth/protocol/openid-connect/token`;
    }
    async getUserInfoUrl() {
        const baseUrl = await this.configService.getApiBaseUrl();
        return `${baseUrl}/api/v1/proxy/realms/auth/protocol/openid-connect/userinfo`;
    }
    async getProjectsUrl() {
        const baseUrl = await this.configService.getApiBaseUrl();
        return `${baseUrl}/api/v1/proxy/localization/api/localization-project?pageSize=100`;
    }
    async getFetchLocalesUrl(locale, projectKey) {
        const baseUrl = await this.configService.getLocalizationApiBaseUrl();
        return `${baseUrl}/api/v1/localization/${projectKey}/language/${locale}`;
    }
    async getCreateKeyUrl(projectKey) {
        const baseUrl = await this.configService.getApiBaseUrl();
        return `${baseUrl}/api/v1/proxy/localization/api/localization/${projectKey}/new`;
    }
    async getUpdateKeyUrl(projectKey) {
        const baseUrl = await this.configService.getApiBaseUrl();
        return `${baseUrl}/api/v1/proxy/localization/api/localization/${projectKey}`;
    }
    async getSearchKeysUrl(projectKey) {
        const baseUrl = await this.configService.getApiBaseUrl();
        return `${baseUrl}/api/v1/proxy/localization/api/localization/${projectKey}`;
    }
    async authenticate(username, password) {
        const formBody = this.buildAuthBody(username, password);
        const res = await (0, node_fetch_1.default)(await this.getAuthUrl(), {
            headers: {
                "endpoint": "KC_AUTH",
                "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: formBody.toString(),
            method: "POST"
        });
        if (!res.ok) {
            try {
                const errorData = await res.json();
                const errorMessage = errorData.error_description || errorData.error || 'Ошибка авторизации';
                throw new Error(errorMessage);
            }
            catch (parseError) {
                if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
                    throw parseError;
                }
                throw new Error(`Ошибка авторизации: ${res.status} ${res.statusText}`);
            }
        }
        const data = await res.json();
        return data;
    }
    async refreshToken(refreshToken) {
        const params = new url_1.URLSearchParams();
        params.append('grant_type', this.GRANT_TYPE_REFRESH);
        params.append('refresh_token', refreshToken);
        params.append('client_id', this.CLIENT_ID);
        params.append('client_secret', this.CLIENT_SECRET);
        const res = await (0, node_fetch_1.default)(await this.getAuthUrl(), {
            headers: {
                "endpoint": "KC_AUTH",
                "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: params.toString(),
            method: "POST"
        });
        if (!res.ok) {
            try {
                const errorData = await res.json();
                const errorMessage = errorData.error_description || errorData.error || 'Ошибка обновления токена';
                throw new Error(errorMessage);
            }
            catch (parseError) {
                if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
                    throw parseError;
                }
                throw new Error(`Ошибка обновления токена: ${res.status} ${res.statusText}`);
            }
        }
        const data = await res.json();
        return data;
    }
    async getUserInfo(token) {
        const url = await this.getUserInfoUrl();
        const res = await (0, node_fetch_1.default)(url, {
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
    async ensureValidToken() {
        if (!this.storageService) {
            throw new Error('StorageService не настроен');
        }
        const accessToken = await this.storageService.getAccessToken();
        if (!accessToken) {
            throw new Error('Токен не найден');
        }
        return accessToken;
    }
    async refreshTokenIfNeeded() {
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
                const refreshToken = await this.storageService.getRefreshToken();
                if (!refreshToken) {
                    await this.storageService.deleteTokens();
                    throw new Error('Refresh token не найден');
                }
                const authResponse = await this.refreshToken(refreshToken);
                await this.storageService.saveTokens(authResponse);
                return authResponse;
            }
            catch (error) {
                await this.storageService.deleteTokens();
                throw error;
            }
            finally {
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
    async makeRequestWithTokenRefresh(requestFn) {
        let token = await this.ensureValidToken();
        try {
            return await requestFn(token);
        }
        catch (error) {
            if (error.status === 401 || (error.message && error.message.includes('401'))) {
                token = await this.refreshTokenIfNeeded();
                return await requestFn(token);
            }
            throw error;
        }
    }
    async fetchProjects(token) {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.fetchProjects(t));
        }
        const actualToken = token || await this.ensureValidToken();
        const url = await this.getProjectsUrl();
        const res = await (0, node_fetch_1.default)(url, {
            headers: {
                'authorization': `Bearer ${actualToken}`,
            },
            method: 'GET'
        });
        if (!res.ok) {
            const error = new Error(`Failed to fetch projects: ${res.status}`);
            error.status = res.status;
            throw error;
        }
        const data = await res.json();
        return data;
    }
    async fetchLocales(token, locale, projectKey) {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.fetchLocales(t, locale, projectKey));
        }
        const actualToken = token || await this.ensureValidToken();
        const url = await this.getFetchLocalesUrl(locale, projectKey);
        const res = await (0, node_fetch_1.default)(url, {
            headers: {
                Authorization: `Bearer ${actualToken}`
            }
        });
        if (!res.ok) {
            const error = new Error(`Failed to fetch locales for ${locale}: ${res.status}`);
            error.status = res.status;
            throw error;
        }
        const data = await res.json();
        return data.data;
    }
    async createKey(token, request, projectKey) {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.createKey(t, request, projectKey));
        }
        const actualToken = token || await this.ensureValidToken();
        const url = await this.getCreateKeyUrl(projectKey);
        const res = await (0, node_fetch_1.default)(url, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${actualToken}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(request)
        });
        const data = await res.json();
        if (!res.ok || 'message' in data) {
            const error = data;
            if (error.message.includes('duplicate key')) {
                throw new Error('Ключ уже существует');
            }
            const err = new Error(error.message || `Failed to create key: ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return data;
    }
    async updateKey(token, request, projectKey) {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.updateKey(t, request, projectKey));
        }
        const actualToken = token || await this.ensureValidToken();
        const url = await this.getUpdateKeyUrl(projectKey);
        const res = await (0, node_fetch_1.default)(url, {
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
            err.status = res.status;
            throw err;
        }
        let data;
        try {
            data = JSON.parse(text);
        }
        catch (e) {
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }
        if (!res.ok || 'message' in data) {
            const error = data;
            const err = new Error(error.message || `Failed to update key: ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return data;
    }
    async searchKeys(token, search, projectKey, pageNumber = 1, pageSize = 10) {
        if (this.storageService && !token) {
            return this.makeRequestWithTokenRefresh((t) => this.searchKeys(t, search, projectKey, pageNumber, pageSize));
        }
        const actualToken = token || await this.ensureValidToken();
        const params = new url_1.URLSearchParams();
        params.append('pageNumber', pageNumber.toString());
        params.append('pageSize', pageSize.toString());
        if (search && search.trim()) {
            params.append('search', search.trim());
        }
        const url = `${await this.getSearchKeysUrl(projectKey)}?${params.toString()}`;
        const res = await (0, node_fetch_1.default)(url, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${actualToken}`,
            }
        });
        if (!res.ok) {
            const error = new Error(`Failed to search keys: ${res.status}`);
            error.status = res.status;
            throw error;
        }
        const data = await res.json();
        return data;
    }
    buildAuthBody(username, password) {
        const params = new url_1.URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        params.append('client_id', this.CLIENT_ID);
        params.append('client_secret', this.CLIENT_SECRET);
        params.append('grant_type', this.GRANT_TYPE_PASSWORD);
        params.append('scope', this.SCOPE);
        return params;
    }
}
exports.ApiService = ApiService;
//# sourceMappingURL=api.service.js.map