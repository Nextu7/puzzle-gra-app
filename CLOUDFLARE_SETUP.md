# Konfiguracja Cloudflare Tunnel - Instrukcja Deployment

## Przegląd rozwiązania

Ta aplikacja została skonfigurowana do używania **Cloudflare Tunnel** jako głównego rozwiązania proxy, z ngrok jako fallback dla szybkiego developmentu. Rozwiązanie zapewnia:

- ✅ **Stabilne URL-e** - brak limitów czasowych jak w ngrok
- ✅ **Bezpieczeństwo** - szyfrowane połączenia bez ekspozycji portów
- ✅ **Skalowalnośc** - automatyczne load balancing i DDoS protection
- ✅ **Separacja środowisk** - dedykowane subdomeny dla dev/prod/HMR

## Wymagania

- Domena skonfigurowana w Cloudflare
- Windows PowerShell (dla automatycznego setup-u)
- Uprawnienia administratora (dla instalacji jako usługa Windows)

## Szybki start

### 1. Automatyczny setup (Zalecany)

```powershell
# Uruchom jako Administrator
powershell -ExecutionPolicy Bypass -File scripts/setup-cloudflare-tunnel.ps1 -Domain "twoja-domena.com"
```

Skrypt automatycznie:
- Zainstaluje cloudflared (jeśli nie istnieje)
- Przeprowadzi uwierzytelnienie z Cloudflare
- Utworzy tunel i rekordy DNS
- Zaktualizuje konfigurację aplikacji

### 2. Instalacja jako usługa Windows

```batch
# Uruchom jako Administrator
scripts\install-cloudflare-service.bat
```

### 3. Ręczne uruchomienie (development)

```bash
cloudflared tunnel run --config cloudflare-tunnel.yml puzzle-gra-tunnel
```

## Struktura domen

Po konfiguracji dostępne będą następujące subdomeny:

- **Production**: `https://puzzle-gra.twoja-domena.com` - główna aplikacja
- **Development**: `https://dev-puzzle-gra.twoja-domena.com` - środowisko dev
- **HMR WebSocket**: `https://hmr-puzzle-gra.twoja-domena.com` - hot reload

## Konfiguracja zmiennych środowiskowych

Po uruchomieniu skryptu setup-u, plik `.env` zostanie automatycznie zaktualizowany:

```bash
# Shopify App Configuration  
SHOPIFY_APP_URL=https://puzzle-gra.twoja-domena.com
HOST=https://puzzle-gra.twoja-domena.com

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_URL=https://puzzle-gra.twoja-domena.com
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_id

# Firebase (teraz z zmiennych środowiskowych)
FIREBASE_API_KEY=twój_klucz_api
FIREBASE_AUTH_DOMAIN=twój_projekt.firebaseapp.com
# ... pozostałe klucze Firebase
```

## Aktualizacja konfiguracji Shopify

Zaktualizuj konfigurację w Shopify Partner Dashboard:

1. **App URL**: `https://puzzle-gra.twoja-domena.com`
2. **Redirect URLs**:
   - `https://puzzle-gra.twoja-domena.com/auth/callback`
   - `https://puzzle-gra.twoja-domena.com/auth/shopify/callback`
   - `https://puzzle-gra.twoja-domena.com/api/auth/callback`

## Rozwiązywanie problemów

### Problem: Tunel nie startuje

```bash
# Sprawdź status usługi
sc query CloudflaredPuzzleGra

# Restart usługi
net stop CloudflaredPuzzleGra
net start CloudflaredPuzzleGra

# Sprawdź logi
cloudflared tunnel logs puzzle-gra-tunnel
```

### Problem: Błędy CORS

Upewnij się, że wszystkie domeny są poprawnie skonfigurowane w `vite.config.js`:

```javascript
cors: {
  origin: [
    process.env.SHOPIFY_APP_URL,
    process.env.CLOUDFLARE_TUNNEL_URL,
    'http://localhost:3000'
  ].filter(Boolean),
  credentials: true,
},
```

### Problem: HMR nie działa

1. Sprawdź czy subdomena HMR jest dostępna: `https://hmr-puzzle-gra.twoja-domena.com`
2. Zweryfikuj konfigurację w `vite.config.js`
3. Restart aplikacji i tunelu

## Komendy zarządzania

### Zarządzanie tunelem

```bash
# Lista tuneli
cloudflared tunnel list

# Szczegóły tunelu
cloudflared tunnel info puzzle-gra-tunnel

# Usunięcie tunelu
cloudflared tunnel delete puzzle-gra-tunnel

# Sprawdzenie połączenia
cloudflared tunnel status puzzle-gra-tunnel
```

### Zarządzanie usługą Windows

```batch
# Start
net start CloudflaredPuzzleGra

# Stop
net stop CloudflaredPuzzleGra

# Status
sc query CloudflaredPuzzleGra

# Usunięcie usługi
sc delete CloudflaredPuzzleGra
```

## Migracja z ngrok

Jeśli wcześniej używałeś ngrok:

1. **Zatrzymaj ngrok**: Zamknij wszystkie instancje ngrok
2. **Uruchom setup**: Wykonaj automatyczny setup Cloudflare
3. **Zaktualizuj Shopify**: Zmień URL-e w konfiguracji aplikacji
4. **Przetestuj**: Sprawdź wszystkie funkcjonalności

### Fallback do ngrok (emergency)

W przypadku problemów z Cloudflare, możesz tymczasowo wrócić do ngrok:

```bash
# 1. Zakomentuj w .env:
# SHOPIFY_APP_URL=https://puzzle-gra.twoja-domena.com
# CLOUDFLARE_TUNNEL_URL=https://puzzle-gra.twoja-domena.com

# 2. Odkomentuj:
NGROK_URL=https://twoj-ngrok-url.ngrok-free.app
SHOPIFY_APP_URL=https://twoj-ngrok-url.ngrok-free.app

# 3. Uruchom ngrok
ngrok http 3000
```

## Monitoring i logs

### Cloudflare Dashboard

- Sprawdzaj ruch i analytics w Cloudflare Dashboard
- Monitoruj błędy SSL/TLS
- Konfiguruj dodatkowe security rules jeśli potrzeba

### Lokalne logi

```bash
# Logi tunelu
cloudflared tunnel logs puzzle-gra-tunnel

# Logi aplikacji
npm run dev # zawiera built-in logging
```

## Bezpieczeństwo

### Zmienne środowiskowe

- ✅ **Firebase keys** - przeniesione do `.env`
- ✅ **Shopify secrets** - już w `.env`
- ⚠️ **Sprawdź `.gitignore`** - upewnij się że `.env` nie jest commitowane

### Cloudflare Security

Opcjonalnie skonfiguruj w Cloudflare Dashboard:

- **Access Policies** - ograniczenie dostępu do środowiska dev
- **Rate Limiting** - ochrona przed spam
- **Bot Fight Mode** - dodatkowa ochrona

## Performance

### Optymalizacja

Tunnel został skonfigurowany z optymalnymi ustawieniami:

```yaml
originRequest:
  connectTimeout: 30s
  tlsTimeout: 10s
  tcpKeepAlive: 30s
  keepAliveConnections: 100
  keepAliveTimeout: 90s
```

### Cache

Cloudflare automatycznie cache-uje statyczne assety. Dla development wyłącz cache w CF Dashboard jeśli potrzeba.

---

## ⚡ Next Steps

1. **Uruchom setup**: `powershell scripts/setup-cloudflare-tunnel.ps1 -Domain "twoja-domena.com"`
2. **Zainstaluj usługę**: `scripts\install-cloudflare-service.bat` (jako Admin)
3. **Zaktualizuj Shopify**: Zmień URL-e w Partner Dashboard
4. **Przetestuj**: Sprawdź wszystkie funkcjonalności aplikacji
5. **Monitoruj**: Obserwuj logi i metryki

Gotowe! 🎉 Twoja aplikacja działa teraz na stabilnej infrastrukturze Cloudflare.