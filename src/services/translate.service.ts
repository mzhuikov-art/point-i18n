import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

export class TranslateService {
    private readonly configSection = 'i18nRemote';
    private readonly apiKeyConfigKey = 'deepLApiKey';
    private readonly apiUrl = 'https://api-free.deepl.com/v2/translate';
    
    // Список бета-языков DeepL
    private readonly betaLanguages = ['UZ'];

    async getApiKey(): Promise<string | null> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get<string>(this.apiKeyConfigKey) || null;
    }

    async ensureApiKey(): Promise<string> {
        let apiKey = await this.getApiKey();
        
        if (!apiKey) {
            const action = await vscode.window.showErrorMessage(
                'DeepL API ключ не настроен. Укажите API ключ для работы с переводом.',
                'Настроить'
            );
            
            if (action === 'Настроить') {
                await vscode.commands.executeCommand('i18nRemote.configDeepLApiKey');
                apiKey = await this.getApiKey();
                
                if (!apiKey) {
                    throw new Error('DeepL API ключ не настроен');
                }
            } else {
                throw new Error('DeepL API ключ не настроен');
            }
        }
        
        return apiKey;
    }

    async translate(text: string, targetLanguage: string): Promise<string> {
        if (!text || !text.trim()) {
            return '';
        }

        const apiKey = await this.ensureApiKey();
        const sourceLanguage = 'RU'; // Всегда переводим с русского

        // DeepL использует коды языков в верхнем регистре
        const deeplLanguages: Record<string, string> = {
            cn: 'ZH'
        };
        const targetLang = deeplLanguages[targetLanguage.toLowerCase()] || targetLanguage.toUpperCase();
        
        // Проверяем, является ли целевой язык бета-языком
        const isBetaLanguage = this.betaLanguages.includes(targetLang);

        const formData = new URLSearchParams();
        formData.append('text', text);
        formData.append('source_lang', sourceLanguage);
        formData.append('target_lang', targetLang);
        
        // Добавляем параметр для бета-языков
        if (isBetaLanguage) {
            formData.append('enable_beta_languages', '1');
        }

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Ошибка перевода: ${response.status}`;
            
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch {
                // Игнорируем ошибку парсинга
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json() as {
            translations: Array<{
                text: string;
                detected_source_language?: string;
            }>;
        };

        if (!data.translations || data.translations.length === 0) {
            throw new Error('Пустой ответ от DeepL API');
        }

        return data.translations[0].text;
    }

    async translateToEnAndUz(ruText: string): Promise<{ en: string; uz: string; cn: string }> {
        if (!ruText || !ruText.trim()) {
            return { en: '', uz: '', cn: '' };
        }

        try {
            const en = await this.translate(ruText, 'EN');

            let uz = '';
            try {
                uz = await this.translate(ruText, 'UZ');
            } catch (uzError: any) {
                console.log('Ошибка перевода на узбекский язык:', uzError.message);
            }

            let cn = '';
            try {
                cn = await this.translate(ruText, 'cn');
            } catch (cnError: any) {
                console.log('Ошибка перевода на китайский язык:', cnError.message);
            }

            return { en, uz, cn };
        } catch (error: any) {
            const errorMessage = error.message || 'Ошибка перевода';
            throw new Error(errorMessage);
        }
    }
}

