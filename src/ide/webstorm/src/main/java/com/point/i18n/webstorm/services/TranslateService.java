package com.point.i18n.webstorm.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/**
 * Service for translation using DeepL API.
 */
public class TranslateService {
    private static final String API_URL = "https://api-free.deepl.com/v2/translate";
    private static final List<String> BETA_LANGUAGES = Arrays.asList("UZ");
    
    private final ConfigService configService;
    private final ObjectMapper objectMapper;
    
    public TranslateService(ConfigService configService) {
        this.configService = configService;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
    
    public String getApiKey() throws IllegalStateException {
        String apiKey = configService.getDeepLApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("DeepL API ключ не настроен");
        }
        return apiKey;
    }
    
    public String translate(String text, String targetLanguage) throws IOException {
        if (text == null || text.trim().isEmpty()) {
            return "";
        }
        
        String apiKey = getApiKey();
        String sourceLanguage = "RU"; // Всегда переводим с русского
        String targetLang = targetLanguage.toUpperCase();
        
        boolean isBetaLanguage = BETA_LANGUAGES.contains(targetLang);
        
        // Формируем form-data
        StringBuilder formData = new StringBuilder();
        formData.append("text=").append(URLEncoder.encode(text, StandardCharsets.UTF_8));
        formData.append("&source_lang=").append(sourceLanguage);
        formData.append("&target_lang=").append(targetLang);
        if (isBetaLanguage) {
            formData.append("&enable_beta_languages=1");
        }
        
        URL url = new URL(API_URL);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Authorization", "DeepL-Auth-Key " + apiKey);
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        connection.setDoOutput(true);
        
        try (java.io.OutputStream os = connection.getOutputStream()) {
            byte[] input = formData.toString().getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }
        
        int responseCode = connection.getResponseCode();
        String responseText;
        
        // Читаем ответ
        try (java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(
                    responseCode >= 200 && responseCode < 300 
                        ? connection.getInputStream() 
                        : connection.getErrorStream(), 
                    StandardCharsets.UTF_8))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            responseText = response.toString();
        }
        
        if (responseCode != HttpURLConnection.HTTP_OK) {
            String errorMessage = "Ошибка перевода: " + responseCode;
            try {
                TranslateErrorResponse errorResponse = objectMapper.readValue(responseText, TranslateErrorResponse.class);
                if (errorResponse.message != null && !errorResponse.message.isEmpty()) {
                    errorMessage = errorResponse.message;
                }
            } catch (Exception e) {
                // Игнорируем ошибку парсинга
            }
            throw new IOException(errorMessage);
        }
        
        TranslateResponse translateResponse = objectMapper.readValue(responseText, TranslateResponse.class);
        
        if (translateResponse.translations == null || translateResponse.translations.isEmpty()) {
            throw new IOException("Пустой ответ от DeepL API");
        }
        
        return translateResponse.translations.get(0).text;
    }
    
    public TranslationResult translateToEnAndUz(String ruText) throws IOException {
        if (ruText == null || ruText.trim().isEmpty()) {
            return new TranslationResult("", "");
        }
        
        String en = translate(ruText, "EN");
        
        String uz = "";
        try {
            uz = translate(ruText, "UZ");
        } catch (Exception e) {
            // Если перевод на узбекский не удался, оставляем пустую строку
            System.out.println("Ошибка перевода на узбекский язык: " + e.getMessage());
        }
        
        return new TranslationResult(en, uz);
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class TranslateResponse {
        public java.util.List<Translation> translations;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class Translation {
        public String text;
        public String detected_source_language;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class TranslateErrorResponse {
        public String message;
    }
    
    public static class TranslationResult {
        public final String en;
        public final String uz;
        
        public TranslationResult(String en, String uz) {
            this.en = en;
            this.uz = uz;
        }
    }
}

