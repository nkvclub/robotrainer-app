# Задание для агента сайта: значки магазинов на robotrainer.ru

Что меняем: на главной robotrainer.ru, в блоке «Приложение с тестом» (секция `id="app"`, класс `rt-app-promo`) рядом со значком Google Play появляется значок RuStore. Строка «Скоро в RuStore и App Store» становится «Скоро в App Store». Тексты блока не трогать. robotrainerpro.com сейчас НЕ трогать.

## Файлы
- `ru-staryi-kusok.html` (https://raw.githubusercontent.com/nkvclub/robotrainer-app/ekrany/sait-znachki/ru-staryi-kusok.html) — как этот кусок выглядит сейчас (ссылка Google Play + строка «Скоро в…»), для поиска и отката.
- `ru-novyi-kusok.html` (https://raw.githubusercontent.com/nkvclub/robotrainer-app/ekrany/sait-znachki/ru-novyi-kusok.html) — чем его заменить.

## Шаги
1. Тема `robotrainer-theme`, файл `front-page.php` (Внешний вид → Редактор файлов темы). Прочитай файл заново прямо перед правкой и сохрани копию для отката.
2. Найди в секции `id="app"` ссылку на `play.google.com/store/apps/details?id=com.robotrainerpro.app` (с картинкой значка) и идущую сразу за ней строку `Скоро в RuStore и App Store.` Этот кусок должен встречаться ровно один раз. В файле вместо `&nbsp;` может стоять обычный или неразрывный пробел, это нормально.
3. Замени этот кусок (ссылку с картинкой + строку «Скоро…») целиком на содержимое `ru-novyi-kusok.html`. Больше ничего не меняй.
4. Сохрани файл, очисти кеш (Autoptimize и другие, если есть).
5. Проверь на телефоне (ширина 390) и на компьютере: в коде страницы есть строка `RT store badges 25.10.2026`; видны два чёрных значка одной высоты (RuStore и Google Play); значок RuStore открывает https://www.rustore.ru/catalog/app/ru.robotrainer.app, Google Play открывает страницу приложения; нет горизонтальной прокрутки; ошибок в консоли нет.

Пароли Nov вводит сам.
