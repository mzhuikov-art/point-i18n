package com.point.i18n.webstorm.services;

import java.util.*;

/**
 * Service for caching translations.
 * Java implementation of the TypeScript CacheService.
 */
public class CacheService {
    private final Map<String, Map<String, String>> cache = new HashMap<>();
    
    public Map<String, String> get(String locale) {
        return cache.get(locale);
    }
    
    public void set(String locale, Map<String, String> data) {
        cache.put(locale, data);
    }
    
    public boolean has(String locale) {
        return cache.containsKey(locale);
    }
    
    public void clear() {
        cache.clear();
    }
    
    public String getTranslation(String locale, String key) {
        Map<String, String> localeData = cache.get(locale);
        return localeData != null ? localeData.get(key) : null;
    }
    
    public void addKey(String key, Map<String, String> translations) {
        for (Map.Entry<String, String> entry : translations.entrySet()) {
            String locale = entry.getKey();
            String translation = entry.getValue();
            Map<String, String> localeData = cache.computeIfAbsent(locale, k -> new HashMap<>());
            localeData.put(key, translation);
        }
    }
    
    public void updateKey(String key, Map<String, String> translations) {
        addKey(key, translations);
    }
    
    public List<KeySearchResult> searchKeys(String query) {
        List<KeySearchResult> results = new ArrayList<>();
        String queryLower = query != null ? query.toLowerCase() : "";
        
        if (query == null || query.trim().isEmpty()) {
            return results;
        }
        
        if (cache.isEmpty()) {
            return results;
        }
        
        String firstLocale = cache.keySet().iterator().next();
        Map<String, String> firstLocaleData = cache.get(firstLocale);
        if (firstLocaleData == null) {
            return results;
        }
        
        for (String key : firstLocaleData.keySet()) {
            if (key.toLowerCase().contains(queryLower)) {
                Map<String, String> translations = new HashMap<>();
                for (String locale : cache.keySet()) {
                    Map<String, String> localeData = cache.get(locale);
                    translations.put(locale, localeData != null && localeData.containsKey(key) ? localeData.get(key) : "");
                }
                results.add(new KeySearchResult(key, translations));
            }
        }
        
        return results;
    }
    
    public static class KeySearchResult {
        public final String key;
        public final Map<String, String> translations;
        
        public KeySearchResult(String key, Map<String, String> translations) {
            this.key = key;
            this.translations = translations;
        }
    }
}

