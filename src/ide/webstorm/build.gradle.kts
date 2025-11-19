plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.22"
    id("org.jetbrains.intellij") version "1.17.3"
}

group = "com.point"
version = "1.1.6"

repositories {
    mavenCentral()
}

intellij {
    version.set("2023.3") // Попробуем более новую версию
    type.set("IC") // IntelliJ IDEA Community (используется для разработки, плагин работает в WebStorm)
    // JavaScript плагин встроен в IDEA Community, не нужно указывать отдельно
    plugins.set(listOf())
    updateSinceUntilBuild.set(false) // Отключаем автоматическое обновление версий
}

sourceSets {
    main {
        java {
            srcDirs("src/main/java")
        }
        resources {
            srcDirs("src/main/resources")
            srcDirs("../../../out/webstorm")
        }
    }
}

// Настройка обработки дубликатов
tasks.processResources {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

tasks {
    withType<JavaCompile> {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    // Задача для сборки TypeScript перед сборкой плагина
    register<Exec>("buildTypeScript") {
        group = "build"
        description = "Compile TypeScript code for WebStorm plugin"
        workingDir = file("${projectDir}/../../..")
        commandLine = listOf("pnpm", "run", "build:webstorm")
        doFirst {
            println("Building TypeScript for WebStorm plugin...")
        }
    }

    // Задача для сборки TypeScript в watch режиме
    register<Exec>("watchTypeScript") {
        group = "build"
        description = "Watch TypeScript code for WebStorm plugin"
        workingDir = project.rootDir
        commandLine = listOf("pnpm", "run", "build:webstorm")
        // Для watch режима можно использовать tsc --watch
    }

    // Зависимость: сборка TypeScript перед компиляцией Java
    compileJava {
        dependsOn("buildTypeScript")
    }

    // Зависимость: сборка TypeScript перед запуском плагина
    runIde {
        dependsOn("buildTypeScript")
    }

    // Зависимость: сборка TypeScript перед подготовкой плагина
    buildPlugin {
        dependsOn("buildTypeScript")
        doLast {
            // Копируем собранный плагин в корневую папку проекта
            val pluginZip = file("${layout.buildDirectory.get()}/distributions/point-i18n-webstorm-${version}.zip")
            val rootDir = file("${projectDir}/../../..")
            val targetFile = file("${rootDir}/point-i18n-webstorm-${version}.zip")
            
            if (pluginZip.exists()) {
                pluginZip.copyTo(targetFile, overwrite = true)
                println("Plugin copied to: ${targetFile.absolutePath}")
            }
        }
    }

    patchPluginXml {
        sinceBuild.set("233")
        untilBuild.set("253.*")
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }
}

dependencies {
    implementation("com.fasterxml.jackson.core:jackson-databind:2.15.2")
    implementation("com.fasterxml.jackson.core:jackson-core:2.15.2")
    implementation("com.fasterxml.jackson.core:jackson-annotations:2.15.2")
}

