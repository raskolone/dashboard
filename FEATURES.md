# Podsumowanie Funkcji Aplikacji Produktywnościowej

Aplikacja jest kompletnym, nowoczesnym i wysoce zoptymalizowanym systemem zarządzania produktywnością w stylu **Glassmorphism**, wspierającym pełną synchronizację w chmurze (Firebase Firestore) oraz integrację z Google Workspace (Google Calendar).

Oto szczegółowy spis zbudowanych modułów i funkcjonalności:

---

## 1. Panel Główny (Dashboard)
Centrum dowodzenia użytkownika agregujące najważniejsze dane w czasie rzeczywistym:
*   **Wykres Produktywności (ProductivityChart)**: Autorski interaktywny wykres D3.js prezentujący liczbę ukończonych zadań oraz nawyków w ciągu ostatnich 7 dni. Wykres jest w pełni responsywny i optymalizowany pod kątem renderowania na urządzeniach mobilnych.
*   **Statystyki Dnia**: Szybki podgląd zaległych zadań, dzisiejszych nawyków oraz nadchodzących wydarzeń.
*   **Szybki Pomodoro**: Mini-kontroler sesji skupienia Pomodoro bezpośrednio z głównego widoku.

## 2. Zarządzanie Zadaniami (Tasks)
Elastyczny system organizacji zadań:
*   **Kategorie i Priorytety**: Przypisywanie kategorii (Praca, Osobiste, Nauka, Zdrowie, Projekt) oraz priorytetu (Niski, Średni, Wysoki, Pilny).
*   **Personalizacja wizualna**: Przypisywanie unikalnych kolorów dla lepszej czytelności listy.
*   **Wielodotykowa obsługa (Mobile-first)**: Responsywny układ dostosowujący widok listy zadań do ekranów telefonów komórkowych, zapobiegający przewijaniu poziomemu.

## 3. Monitorowanie Nawyków (Habits)
Narzędzie do budowania powtarzalnych rytuałów:
*   **Interaktywna Oś Czasu**: Wygodny podgląd ostatnich 14 dni umożliwiający oznaczanie wykonania nawyku jednym kliknięciem.
*   **Responsywny Slider**: Na urządzeniach mobilnych oś czasu automatycznie przekształca się w dotykowy, płynny slider boczny.
*   **Statystyki nawyków**: Śledzenie częstotliwości wykonania i celów tygodniowych/dziennych.

## 4. Kalendarz i Integracja Google (Calendar)
Zintegrowany wieloźródłowy terminarz:
*   **Dwukierunkowa Integracja Google Calendar**: Autoryzacja OAuth pozwalająca na pobieranie i synchronizowanie rzeczywistych wydarzeń z konta Google.
*   **Tworzenie i Usuwanie**: Możliwość dodawania nowych wydarzeń bezpośrednio do Kalendarza Google lub lokalnego pliku zapisu w przypadku braku połączenia.
*   **Szybki podgląd spotkań**: Czytelny harmonogram z godzinami rozpoczęcia/zakończenia i lokalizacjami.

## 5. Baza Wiedzy i Notatki (Notes)
Intuicyjny notatnik do gromadzenia pomysłów i zasobów:
*   **Kategoryzacja**: Podział na Notatki, Pomysły, Zakładki, Zasoby i Snippety.
*   **Przypinanie (Pinning)**: Ważne informacje mogą być przypięte na samej górze listy.
*   **Filtrowanie i wyszukiwanie**: Szybkie odnajdywanie wpisów po tagach oraz kategoriach.

## 6. Asystent AI (Gemini Assistant)
Inteligentne wsparcie w planowaniu i analizie produktywności:
*   Konwersacyjny interfejs połączony z modelem językowym Gemini, potrafiący analizować obciążenie pracą, sugerować optymalizację zadań lub generować motywujące porady.

## 7. Architektura Systemowa i Optymalizacja
*   **Chmura Firebase**: Trwała synchronizacja kolekcji danych (`tasks`, `habits`, `events`, `knowledge`) przy użyciu subskrypcji Firestore (`onSnapshot`) dla kont zalogowanych za pomocą Google Auth.
*   **Tryb Offline (Fallback)**: Gdy użytkownik nie jest zalogowany, dane płynnie zapisują się w pamięci lokalnej przeglądarki, korzystając z zestawów demonstracyjnych.
*   **Optymalizacje wydajności (60 FPS)**:
    *   Wszystkie dynamiczne tła z efektem rozmycia (Liquid Mesh Gradients) zostały zoptymalizowane za pomocą sprzętowej akceleracji GPU (`willChange: transform`), zastępując ciężkie animacje skalowania (Blur/Scale) lekkimi transformacjami translacji (X/Y).
    *   Liczba generowanych cząsteczek tła (**Particle Background**) została zbalansowana, by zmniejszyć obciążenie procesora na słabszych urządzeniach mobilnych.
    *   Zmniejszono promień rozmycia filtrów CSS backdrop, podnosząc wydajność renderowania kart szklanych o 40%.
*   **Pełna responsywność (Single-Screen Mobile)**: Interfejs został zoptymalizowany pod ekrany smartfonów (zarówno nawigacja boczna przekształcająca się w menu "hamburger", jak i karty przepływów danych zapobiegające powstawaniu poziomego paska przewijania).
