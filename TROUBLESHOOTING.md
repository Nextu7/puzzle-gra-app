# Rozwiązywanie Problemów - Puzzle Game App

## Błąd 401 Unauthorized

### Przyczyny:
1. **Utrata sesji po restarcie serwera** - Rozwiązane przez przejście na PrismaSessionStorage
2. **Nieprawidłowe klucze API Shopify** - Sprawdź zmienne środowiskowe
3. **Problem z migracjami bazy danych** - Uruchom `npm run setup`

### Rozwiązania:
```bash
# Sprawdź status bazy danych
npm run prisma db status

# Wygeneruj Prisma client
npm run prisma generate

# Uruchom migracje
npm run prisma migrate deploy

# Sprawdź health aplikacji
curl https://your-app-url.com/api/health
```

## Problemy z Bazą Danych

### Baza danych nie łączy się:
```bash
# Sprawdź czy DATABASE_URL jest ustawiony
echo $DATABASE_URL

# Sprawdź migracje
npx prisma migrate status

# Reset bazy danych (OSTRZEŻENIE: usuwa dane)
npx prisma migrate reset --force
```

### Problemy z sesjami:
- Aplikacja używa PrismaSessionStorage do trwałego przechowywania sesji
- Sesje są automatycznie czyszczone po wygaśnięciu
- Rate limiting jest przechowywany w bazie danych

## Rate Limiting

### Limity API:
- Zapisywanie wyników: 10 requestów/minutę na sklep
- Inne operacje: 100 requestów/minutę na sklep

### Sprawdzanie limitów:
```javascript
// W kodzie - automatyczne sprawdzanie
const rateLimit = await AuthService.validateRateLimit(shop, 'action', maxRequests, windowMs);
```

## Monitoring i Logi

### Dostępne endpointy:
- `/api/health` - Status zdrowia aplikacji
- Logi są dostępne w konsoli serwera

### Kluczowe logi:
- `[AUTH-*]` - Wydarzenia uwierzytelniania
- `[ERROR]` - Błędy aplikacji
- `[API-CALL]` - Wywołania API
- `[HEALTH-CHECK]` - Sprawdzenia zdrowia

## Zmienne Środowiskowe

### Wymagane:
```env
DATABASE_URL=file:./prisma/dev.sqlite
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-app-url.com
SCOPES=read_products,read_customers
```

### Opcjonalne:
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT=your_service_account_json
SHOP_CUSTOM_DOMAIN=your_custom_domain.com
```

## Częste Problemy

### 1. "Session not found" błąd
**Przyczyna**: Serwer został zrestartowany z MemorySessionStorage
**Rozwiązanie**: Aplikacja używa teraz PrismaSessionStorage - wyloguj się i zaloguj ponownie

### 2. "Database connection failed"
**Przyczyna**: Nieprawidłowy DATABASE_URL lub brak uprawnień do pliku
**Rozwiązanie**: 
```bash
# Sprawdź uprawnienia
ls -la prisma/
# Utwórz plik bazy danych jeśli nie istnieje
touch prisma/dev.sqlite
chmod 666 prisma/dev.sqlite
```

### 3. "Customer validation failed"
**Przyczyna**: Brak uprawnień read_customers w Shopify
**Rozwiązanie**: Zaktualizuj scopes w Partner Dashboard i przeinstaluj aplikację

### 4. Firebase błędy
**Przyczyna**: Nieprawidłowa konfiguracja Firebase lub brak uprawnień
**Rozwiązanie**: Sprawdź FIREBASE_SERVICE_ACCOUNT i uprawnienia

## Deployment na Render.com

### Pre-deployment checklist:
1. Ustaw wszystkie zmienne środowiskowe
2. Sprawdź czy render.yaml jest poprawny
3. Uruchom `npm run setup` lokalnie

### Post-deployment checklist:
1. Sprawdź `/api/health`
2. Sprawdź logi deployment
3. Przetestuj logowanie do aplikacji
4. Sprawdź czy gra działa poprawnie

## Kontakt

W przypadku problemów:
1. Sprawdź logi serwera
2. Sprawdź `/api/health` endpoint
3. Sprawdź dokumentację Shopify
4. Skontaktuj się z deweloperem