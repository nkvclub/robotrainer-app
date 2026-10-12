# РобоТренер — приложение с тестом задержки дыхания

Бесплатный тест (RU + EN) как лид-магнит для robotrainer.ru и robotrainerpro.com.
Один код (Capacitor) → Android и iOS.

## Что внутри
- `www/` — само приложение (HTML/CSS/JS без сборщика):
  - `index.html` — экраны: предупреждение, тест, история, настройки, форма email.
  - `app.js` — логика теста (тот же алгоритм и пороги, что на сайтах), история, напоминания, звук, вибрация.
  - `i18n.js` — все тексты RU/EN.
  - `config.js` — адреса сайта, политики и адрес приёма email (`EMAIL_ENDPOINT`, пока пустой).
- `android/` — нативный проект Android (создан `npx cap add android`).
- `.github/workflows/android.yml` — GitHub сам собирает отладочный APK при каждом push в `main`.

## Как собрать
```
npm ci
npx cap sync android
cd android && ./gradlew assembleDebug   # нужен Android SDK
```
Или просто push в GitHub — готовый APK появится во вкладке Actions → Artifacts.

## Ещё не сделано
- Отправка email на сайт (нужен приёмник на WordPress, согласовать с владельцем сайта).
- Иконка и заставка приложения.
- iOS-проект (`npx cap add ios`, собирается на Mac).
- Подписанная релизная сборка для магазинов.
