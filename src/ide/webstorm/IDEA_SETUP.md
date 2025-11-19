# Настройка проекта в IntelliJ IDEA

## Проблема: Gradle не отображается в Tool Windows

## Решение:

### Вариант 1: Открыть Gradle проект напрямую

1. **Закройте текущий проект** (если открыт)

2. **Откройте Gradle проект:**
   - `File > Open`
   - Выберите папку: `/Users/maksim.zhuikov/work/point-i18n/src/ide/webstorm`
   - **Важно:** Выберите именно папку `webstorm`, а не корень проекта!

3. **IntelliJ IDEA спросит:**
   - "Open as Project" или "Import Gradle Project"
   - Выберите **"Import Gradle Project"**

4. **Дождитесь синхронизации Gradle:**
   - Внизу справа будет индикатор синхронизации
   - Может занять несколько минут при первом запуске

5. **После синхронизации:**
   - `View > Tool Windows > Gradle` должен появиться
   - Или нажмите `Cmd+Shift+A` и введите "Gradle"

### Вариант 2: Добавить Gradle в существующий проект

1. **Откройте настройки:**
   - `IntelliJ IDEA > Settings` (или `Cmd+,`)

2. **Найдите Gradle:**
   - `Build, Execution, Deployment > Build Tools > Gradle`

3. **Настройте:**
   - **Use Gradle from:** выберите "Specified location" или "Gradle wrapper"
   - Если wrapper не найден, укажите путь к Gradle

4. **Добавьте Gradle проект:**
   - `File > New > Module from Existing Sources...`
   - Выберите папку: `src/ide/webstorm`
   - Выберите "Import module from external model" > "Gradle"
   - Нажмите "Finish"

### Вариант 3: Использовать командную строку (самый простой)

Если Gradle не работает в IDEA, просто запустите из терминала:

```bash
cd /Users/maksim.zhuikov/work/point-i18n/src/ide/webstorm

# Настройте Java (если еще не настроено)
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"

# Запустите плагин
./gradlew runIde
```

## Проверка

После настройки проверьте:

1. **Gradle панель видна:**
   - `View > Tool Windows > Gradle`
   - Должно показать дерево задач

2. **Задачи видны:**
   - `point-i18n-webstorm > Tasks > intellij > runIde`

3. **Можно запустить:**
   - Двойной клик на `runIde`
   - Или правой кнопкой > `Run 'runIde'`

## Если ничего не помогает

Используйте командную строку - это самый надежный способ:

```bash
cd src/ide/webstorm
./run.sh
```

