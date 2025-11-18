package com.point.i18n.webstorm.utils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Утилита для парсинга ключей локализации из текста.
 * Java-реализация TypeScript key-parser с расширенной поддержкой паттернов.
 */
public class I18nKeyParser {
    // Паттерны для поиска ключей локализации
    private static final Pattern[] PATTERNS = {
        // $t('key') или $t("key") или $t(`key`)
        Pattern.compile("\\$t\\s*\\(\\s*(['\"`])([^'\"`\\)]+)\\1"),
        
        // i18n.t('key') или i18n.t("key") или i18n.t(`key`)
        Pattern.compile("i18n\\.t\\s*\\(\\s*(['\"`])([^'\"`\\)]+)\\1"),
        
        // t('key') или t("key") или t(`key`) - только если это функция (проверяем что перед t нет буквы/цифры)
        Pattern.compile("(?<![a-zA-Z0-9_])t\\s*\\(\\s*(['\"`])([^'\"`\\)]+)\\1"),
        
        // useI18n().t('key')
        Pattern.compile("useI18n\\(\\)\\.t\\s*\\(\\s*(['\"`])([^'\"`\\)]+)\\1"),
        
        // this.$t('key') или this.t('key')
        Pattern.compile("this\\.\\$?t\\s*\\(\\s*(['\"`])([^'\"`\\)]+)\\1"),
        
        // Поддержка v-t директивы Vue: v-t="'key'"
        Pattern.compile("v-t\\s*=\\s*\"(['\"`])([^'\"`]+)\\1\""),
        
        // Поддержка i18n-t компонента Vue: <i18n-t keypath="key">
        Pattern.compile("keypath\\s*=\\s*\"([^\"]+)\""),
        Pattern.compile("keypath\\s*=\\s*'([^']+)'")
    };
    
    public static class KeyInfo {
        public final String key;
        public final int startOffset;
        public final int endOffset;
        
        public KeyInfo(String key, int startOffset, int endOffset) {
            this.key = key;
            this.startOffset = startOffset;
            this.endOffset = endOffset;
        }
        
        @Override
        public String toString() {
            return "KeyInfo{key='" + key + "', start=" + startOffset + ", end=" + endOffset + "}";
        }
    }
    
    /**
     * Находит ключ локализации на заданной позиции в тексте.
     * 
     * @param text текст для поиска
     * @param offset позиция курсора
     * @return информация о ключе или null
     */
    public static KeyInfo findKeyAtOffset(String text, int offset) {
        if (text == null || text.isEmpty() || offset < 0 || offset >= text.length()) {
            return null;
        }
        
        for (Pattern pattern : PATTERNS) {
            try {
                Matcher matcher = pattern.matcher(text);
                while (matcher.find()) {
                    int matchStart = matcher.start();
                    int matchEnd = matcher.end();
                    
                    // Проверяем, попадает ли offset в диапазон совпадения
                    if (offset >= matchStart && offset <= matchEnd) {
                        String key = extractKeyFromMatch(matcher);
                        if (key != null && !key.isEmpty()) {
                            // Вычисляем точные позиции ключа
                            int keyStart = findKeyStartInMatch(matcher, key);
                            int keyEnd = keyStart + key.length();
                            
                            return new KeyInfo(key, keyStart, keyEnd);
                        }
                    }
                }
            } catch (Exception e) {
                // Игнорируем ошибки регулярных выражений
            }
        }
        
        return null;
    }
    
    /**
     * Находит все ключи локализации в тексте.
     * 
     * @param text текст для поиска
     * @return список найденных ключей
     */
    public static List<KeyInfo> findAllKeys(String text) {
        List<KeyInfo> results = new ArrayList<>();
        
        if (text == null || text.isEmpty()) {
            return results;
        }
        
        for (Pattern pattern : PATTERNS) {
            try {
                Matcher matcher = pattern.matcher(text);
                while (matcher.find()) {
                    String key = extractKeyFromMatch(matcher);
                    if (key != null && !key.isEmpty()) {
                        int keyStart = findKeyStartInMatch(matcher, key);
                        int keyEnd = keyStart + key.length();
                        
                        // Проверяем, что ключ не дублируется
                        boolean isDuplicate = false;
                        for (KeyInfo existing : results) {
                            if (existing.key.equals(key) && 
                                existing.startOffset == keyStart && 
                                existing.endOffset == keyEnd) {
                                isDuplicate = true;
                                break;
                            }
                        }
                        
                        if (!isDuplicate) {
                            results.add(new KeyInfo(key, keyStart, keyEnd));
                        }
                    }
                }
            } catch (Exception e) {
                // Игнорируем ошибки регулярных выражений
            }
        }
        
        return results;
    }
    
    /**
     * Извлекает ключ из совпадения регулярного выражения.
     */
    private static String extractKeyFromMatch(Matcher matcher) {
        // Пытаемся найти ключ в разных группах захвата
        for (int i = matcher.groupCount(); i >= 1; i--) {
            String group = matcher.group(i);
            if (group != null && !group.isEmpty() && !isQuote(group)) {
                return group.trim();
            }
        }
        
        // Если не нашли в группах, пытаемся извлечь из полного совпадения
        String fullMatch = matcher.group(0);
        if (fullMatch != null) {
            // Извлекаем текст между кавычками
            Matcher quoteMatcher = Pattern.compile("['\"`]([^'\"`]+)['\"`]").matcher(fullMatch);
            if (quoteMatcher.find()) {
                return quoteMatcher.group(1).trim();
            }
        }
        
        return null;
    }
    
    /**
     * Находит начальную позицию ключа в совпадении.
     */
    private static int findKeyStartInMatch(Matcher matcher, String key) {
        String fullMatch = matcher.group(0);
        int matchStart = matcher.start();
        
        // Ищем ключ в полном совпадении
        int relativeStart = fullMatch.indexOf(key);
        if (relativeStart != -1) {
            return matchStart + relativeStart;
        }
        
        // Если не нашли точное совпадение, ищем позицию первой кавычки
        for (int i = 0; i < fullMatch.length(); i++) {
            char c = fullMatch.charAt(i);
            if (c == '\'' || c == '"' || c == '`') {
                return matchStart + i + 1; // +1 чтобы пропустить саму кавычку
            }
        }
        
        return matchStart;
    }
    
    /**
     * Проверяет, является ли строка кавычкой.
     */
    private static boolean isQuote(String str) {
        return str != null && str.length() == 1 && 
               (str.equals("'") || str.equals("\"") || str.equals("`"));
    }
    
    /**
     * Валидирует ключ локализации.
     * Ключи должны быть в формате kebab-case.
     */
    public static boolean isValidKey(String key) {
        if (key == null || key.isEmpty()) {
            return false;
        }
        
        // Ключ должен содержать только буквы, цифры, дефисы и точки
        // Примеры валидных ключей: "home-title", "user.profile.name", "error-404"
        return key.matches("^[a-z0-9]+([-.][a-z0-9]+)*$");
    }
}
