export const BASE_LOCALES = ['ru', 'en', 'uz'];

export const CN_LOCALE = 'cn';

export const CN_PROJECT_KEY = 'b2b-frontend';

export const SUPPORTED_LOCALES = [...BASE_LOCALES, CN_LOCALE];

export const OPTIONAL_LOCALES = [CN_LOCALE];

export const isCnProject = (projectKey: string): boolean => projectKey === CN_PROJECT_KEY;

export const getLocalesForProject = (projectKey: string): string[] => (
    isCnProject(projectKey) ? SUPPORTED_LOCALES : [...BASE_LOCALES]
);

