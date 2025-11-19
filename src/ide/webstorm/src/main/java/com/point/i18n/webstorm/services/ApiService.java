package com.point.i18n.webstorm.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for API interactions.
 * Simplified Java implementation of the TypeScript ApiService.
 */
public class ApiService {
    private static final String CLIENT_ID = "auth-client";
    private static final String CLIENT_SECRET = "77X6lydjx3beOw3rcgQ6fwMK6t2tatFo";
    private static final String GRANT_TYPE_PASSWORD = "password";
    private static final String SCOPE = "openid";
    
    private final StorageService storageService;
    private final ConfigService configService;
    private final ObjectMapper objectMapper;
    
    {
        // Настраиваем ObjectMapper для игнорирования неизвестных полей
        objectMapper = new ObjectMapper();
        objectMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
    
    public ApiService(StorageService storageService) {
        this.storageService = storageService;
        this.configService = new ConfigService();
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class AuthResponse {
        public String access_token;
        public String refresh_token;
        public int refresh_expires_in;
        public Integer expires_in; // Может быть в ответе, но не используется
    }
    
    public AuthResponse authenticate(String username, String password) throws IOException {
        String apiBaseUrl = configService.getApiBaseUrl();
        String authUrl = apiBaseUrl + "/api/v1/proxy/realms/auth/protocol/openid-connect/token";
        
        // Формируем тело запроса
        String formBody = String.format(
            "grant_type=%s&username=%s&password=%s&client_id=%s&client_secret=%s&scope=%s",
            GRANT_TYPE_PASSWORD,
            java.net.URLEncoder.encode(username, StandardCharsets.UTF_8),
            java.net.URLEncoder.encode(password, StandardCharsets.UTF_8),
            CLIENT_ID,
            CLIENT_SECRET,
            SCOPE
        );
        
        // Выполняем запрос
        URL url = new URL(authUrl);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
        connection.setRequestProperty("endpoint", "KC_AUTH");
        connection.setDoOutput(true);
        
        try (java.io.OutputStream os = connection.getOutputStream()) {
            byte[] input = formBody.getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }
        
        // Читаем ответ
        int responseCode = connection.getResponseCode();
        if (responseCode != HttpURLConnection.HTTP_OK) {
            String errorMessage = "Authentication failed: " + responseCode;
            try (java.io.BufferedReader reader = new java.io.BufferedReader(
                    new java.io.InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                if (response.length() > 0) {
                    errorMessage = response.toString();
                }
            }
            throw new IOException(errorMessage);
        }
        
        try (java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            
            return objectMapper.readValue(response.toString(), AuthResponse.class);
        }
    }
    
    // Response classes
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class ProjectsResponse {
        public java.util.List<Project> data;
        public int totalCount;
        public int totalPages;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class Project {
        public String key;
        public String name;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class FetchLocalesResponse {
        public Map<String, String> data;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateKeyRequest {
        public String key;
        public Translations translations;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class Translations {
        public String ru;
        public String en;
        public String uz;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateKeyResponse {
        public KeyData data;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class KeyData {
        public String key;
        public Translations translations;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class SearchKeysResponse {
        public java.util.List<KeyData> data;
        public int totalCount;
        public int totalPages;
    }
    
    // Helper method to get token
    private String getToken() throws IOException {
        String token = storageService.getAccessToken();
        if (token == null || token.isEmpty()) {
            throw new IOException("Token not found");
        }
        return token;
    }
    
    // Helper method to make GET request
    private String makeGetRequest(String url, String token) throws IOException {
        URL urlObj = new URL(url);
        HttpURLConnection connection = (HttpURLConnection) urlObj.openConnection();
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Authorization", "Bearer " + token);
        
        int responseCode = connection.getResponseCode();
        if (responseCode != HttpURLConnection.HTTP_OK) {
            throw new IOException("Request failed: " + responseCode);
        }
        
        try (java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            return response.toString();
        }
    }
    
    // Helper method to make POST request
    private String makePostRequest(String url, String token, String jsonBody) throws IOException {
        URL urlObj = new URL(url);
        HttpURLConnection connection = (HttpURLConnection) urlObj.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setDoOutput(true);
        
        try (java.io.OutputStream os = connection.getOutputStream()) {
            byte[] input = jsonBody.getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }
        
        int responseCode = connection.getResponseCode();
        if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_CREATED) {
            String errorMessage = "Request failed: " + responseCode;
            try (java.io.BufferedReader reader = new java.io.BufferedReader(
                    new java.io.InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                if (response.length() > 0) {
                    errorMessage = response.toString();
                }
            }
            throw new IOException(errorMessage);
        }
        
        try (java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            return response.length() > 0 ? response.toString() : "{}";
        }
    }
    
    public ProjectsResponse fetchProjects() throws IOException {
        String token = getToken();
        String apiBaseUrl = configService.getApiBaseUrl();
        String url = apiBaseUrl + "/api/v1/proxy/localization/api/localization-project?pageSize=100";
        String response = makeGetRequest(url, token);
        return objectMapper.readValue(response, ProjectsResponse.class);
    }
    
    public Map<String, String> fetchLocales(String locale, String projectKey) throws IOException {
        String token = getToken();
        String localizationApiBaseUrl = configService.getLocalizationApiBaseUrl();
        String url = localizationApiBaseUrl + "/api/v1/localization/" + projectKey + "/language/" + locale;
        String response = makeGetRequest(url, token);
        FetchLocalesResponse localesResponse = objectMapper.readValue(response, FetchLocalesResponse.class);
        return localesResponse.data != null ? localesResponse.data : new HashMap<>();
    }
    
    public CreateKeyResponse createKey(CreateKeyRequest request, String projectKey) throws IOException {
        String token = getToken();
        String apiBaseUrl = configService.getApiBaseUrl();
        String url = apiBaseUrl + "/api/v1/proxy/localization/api/localization/" + projectKey + "/new";
        String jsonBody = objectMapper.writeValueAsString(request);
        String response = makePostRequest(url, token, jsonBody);
        return objectMapper.readValue(response, CreateKeyResponse.class);
    }
    
    public CreateKeyResponse updateKey(CreateKeyRequest request, String projectKey) throws IOException {
        String token = getToken();
        String apiBaseUrl = configService.getApiBaseUrl();
        String url = apiBaseUrl + "/api/v1/proxy/localization/api/localization/" + projectKey;
        String jsonBody = objectMapper.writeValueAsString(request);
        String responseText = makePostRequest(url, token, jsonBody);
        
        // Обрабатываем пустой ответ или null data
        if (responseText == null || responseText.trim().isEmpty() || responseText.trim().equals("{}")) {
            // Если ответ пустой, но запрос успешен, возвращаем данные из request
            CreateKeyResponse response = new CreateKeyResponse();
            response.data = new KeyData();
            response.data.key = request.key;
            response.data.translations = request.translations;
            return response;
        }
        
        CreateKeyResponse response = objectMapper.readValue(responseText, CreateKeyResponse.class);
        
        // Если data == null, создаем из request
        if (response.data == null) {
            response.data = new KeyData();
            response.data.key = request.key;
            response.data.translations = request.translations;
        }
        
        return response;
    }
    
    public SearchKeysResponse searchKeys(String search, String projectKey, int pageNumber, int pageSize) throws IOException {
        String token = getToken();
        String apiBaseUrl = configService.getApiBaseUrl();
        StringBuilder urlBuilder = new StringBuilder(apiBaseUrl + "/api/v1/proxy/localization/api/localization/" + projectKey);
        urlBuilder.append("?pageNumber=").append(pageNumber);
        urlBuilder.append("&pageSize=").append(pageSize);
        if (search != null && !search.trim().isEmpty()) {
            urlBuilder.append("&search=").append(java.net.URLEncoder.encode(search.trim(), StandardCharsets.UTF_8));
        }
        String url = urlBuilder.toString();
        String response = makeGetRequest(url, token);
        return objectMapper.readValue(response, SearchKeysResponse.class);
    }
}

