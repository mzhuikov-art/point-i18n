export interface AuthRequest {
    username: string;
    password: string;
    client_id: 'auth-client';
    client_secret: '77X6lydjx3beOw3rcgQ6fwMK6t2tatFo';
    grant_type: 'password';
    scope: 'openid';
}

export interface AuthResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    refresh_token: string;
    token_type: string;
    id_token: string;
    "not-before-policy": number;
    session_state: string;
    scope: string;
}

export interface FetchLocalesResponse {
    data: Record<string, string>;
}

export interface CreateKeyRequest {
    key: string;
    translations: {
        ru: string;
        uz: string;
        en: string;
    };
}

export interface CreateKeyResponse {
    data: {
        key: string;
        translations: {
            ru: string;
            uz: string;
            en: string;
        };
    };
}

export interface CreateKeyErrorResponse {
    message: string;
}

export interface UpdateKeyResponse {
    data: {
        key: string;
        translations: {
            ru: string;
            uz: string;
            en: string;
        };
    };
}

export interface SearchKeysResponse {
    data: Array<{
        key: string;
        translations: {
            ru: string;
            uz: string;
            en: string;
        };
    }>;
    totalCount: number;
    totalPages: number;
}

export interface Project {
    key: string;
    name: string;
}

export interface ProjectsResponse {
    data: Project[];
    totalCount: number;
    totalPages: number;
}
