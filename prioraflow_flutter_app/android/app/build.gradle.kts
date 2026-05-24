plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.prioraflow.prioraflow_tech"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.prioraflow.prioraflow_tech"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            // To build a release APK, create a keystore and set these properties
            // in ~/.gradle/gradle.properties or via environment variables:
            //   PRIORAFLOW_STORE_FILE=/path/to/keystore.jks
            //   PRIORAFLOW_STORE_PASSWORD=your_store_password
            //   PRIORAFLOW_KEY_ALIAS=your_key_alias
            //   PRIORAFLOW_KEY_PASSWORD=your_key_password
            val storeFilePath = System.getenv("PRIORAFLOW_STORE_FILE")
                ?: findProject?.properties?.get("PRIORAFLOW_STORE_FILE") as? String
            if (storeFilePath != null) {
                storeFile = file(storeFilePath)
                storePassword = System.getenv("PRIORAFLOW_STORE_PASSWORD")
                    ?: findProject?.properties?.get("PRIORAFLOW_STORE_PASSWORD") as? String ?: ""
                keyAlias = System.getenv("PRIORAFLOW_KEY_ALIAS")
                    ?: findProject?.properties?.get("PRIORAFLOW_KEY_ALIAS") as? String ?: ""
                keyPassword = System.getenv("PRIORAFLOW_KEY_PASSWORD")
                    ?: findProject?.properties?.get("PRIORAFLOW_KEY_PASSWORD") as? String ?: ""
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = true
            // Fallback to debug signing only if no release keystore is configured.
            // This allows `flutter run --release` to work during development,
            // but production builds MUST set PRIORAFLOW_STORE_FILE etc.
            signingConfig = if (signingConfigs.getByName("release").storeFile != null) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
