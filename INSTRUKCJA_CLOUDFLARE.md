# 🚀 INSTRUKCJA URUCHOMIENIA CLOUDFLARE TUNNEL

## ⚠️ WAŻNE: NAJPIERW PRZECZYTAJ TO!

Projekt został przepisany z ngrok na Cloudflare tunnel dla lepszej stabilności połączenia z Shopify.

## 📋 KROKI URUCHOMIENIA

### 1. Skonfiguruj Cloudflare Tunnel (JEDNORAZOWO)

```bash
npm run tunnel:setup
```

Ten skrypt automatycznie:
- Zainstaluje cloudflared
- Utworzy tunnel w Cloudflare
- Skonfiguruje DNS records
- Zaktualizuje pliki konfiguracyjne

**MUSISZ PODAĆ:**
- Swoją domenę (np. `example.com`)
- Uwierzytelnienie w przeglądarce

### 2. Uruchom aplikację

```bash
# Opcja A: Wszystko automatycznie
TERAZ_URUCHOM.bat

# Opcja B: Osobno tunnel i aplikacja
START_CLOUDFLARE.bat  # w jednym oknie
npm run dev           # w drugim oknie
```

## 🔧 CO ZOSTAŁO ZMIENIONE

### ✅ Naprawione pliki:
- `shopify.app.toml` - usunięte ngrok URLs
- `cloudflare-tunnel.yml` - zwiększone timeouty
- `.env` - Cloudflare configuration
- `TERAZ_URUCHOM.bat` - używa Cloudflare
- `START_NGROK.bat` - deprecated warning
- `app/entry.server.jsx` - zwiększone timeouty

### 🔄 Nowa konfiguracja timeoutów:
- `connectTimeout: 60s` (było 30s)
- `tlsTimeout: 30s` (było 10s)  
- `keepAliveTimeout: 120s` (było 90s)
- `streamTimeout: 15000ms` (było 5000ms)

## 🐛 ROZWIĄZYWANIE PROBLEMÓW

### Błąd: "YOUR_TUNNEL_ID" w konfiguracji
```bash
npm run tunnel:setup
```

### Tunnel się nie łączy
1. Sprawdź internet
2. Zrestartuj: `net stop CloudflaredPuzzleGra && net start CloudflaredPuzzleGra`
3. Sprawdź logi: `cloudflared tunnel status puzzle-gra-tunnel`

### Shopify nie widzi aplikacji
1. Zaktualizuj URLs w Shopify Partner Dashboard
2. Użyj: `https://puzzle-gra.YOUR-DOMAIN.com`
3. Dodaj redirect URLs w ustawieniach aplikacji

## 📞 WSPARCIE

Jeśli nadal masz problemy:
1. Sprawdź logi w terminalu
2. Zweryfikuj że DNS propagacja zakończona (może potrwać do 24h)
3. Upewnij się że wszystkie URLs w Shopify używają https://puzzle-gra.YOUR-DOMAIN.com

## 🚫 CO NIE ROBIĆ

- ❌ Nie używaj już ngrok (przestarzałe)
- ❌ Nie mieszaj ngrok z Cloudflare
- ❌ Nie zmieniaj portów bez aktualizacji konfiguracji
- ❌ Nie zamykaj okna z tunnel podczas developmentu