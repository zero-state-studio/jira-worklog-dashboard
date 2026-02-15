# 🚂 Railway Deploy - Quick Checklist

Deploy in **5 minuti** seguendo questi passi:

---

## ✅ Pre-Deploy Checklist

- [ ] Hai un account Railway ([signup gratis](https://railway.app))
- [ ] Progetto pushato su GitHub
- [ ] Google OAuth credentials pronti ([console.cloud.google.com](https://console.cloud.google.com))
- [ ] Secret key generato: `openssl rand -hex 32`

---

## 🚀 Deploy Steps

### **1. Push Codice** (1 min)

```bash
git add Dockerfile .dockerignore railway.toml .env.railway.example backend/app/main.py backend/app/cache.py
git commit -m "Add Railway deployment config"
git push origin main
```

### **2. Deploy su Railway** (2 min)

1. Vai su [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → seleziona `jira-worklog-dashboard`
3. Attendi build (~3-5 min)

### **3. Configura Environment Variables** (2 min)

Railway Dashboard → **Variables** → Add:

```bash
# Obbligatori
DATABASE_PATH=/app/data/worklog_storage.db
SECRET_KEY=<output di: openssl rand -hex 32>
GOOGLE_CLIENT_ID=<da Google Cloud Console>
GOOGLE_CLIENT_SECRET=<da Google Cloud Console>
GOOGLE_REDIRECT_URI=https://<your-app>.railway.app/api/auth/callback
```

**⚠️ Importante:** Sostituisci `<your-app>` con il tuo domain Railway!

### **4. Verifica Volume** (30 sec)

Railway Dashboard → **Settings** → **Volumes**

- Verifica che esista un volume montato su `/app/data`
- Se manca, crealo manualmente (1GB, gratis)

### **5. Configura Google OAuth** (1 min)

[Google Cloud Console](https://console.cloud.google.com) → **Credentials**

- Aggiungi **Authorized redirect URI:**
  ```
  https://your-app-name.up.railway.app/api/auth/callback
  ```

---

## ✅ Post-Deploy Verification

### **Health Check**

```bash
curl https://your-app.railway.app/api/health
```

Risposta OK:
```json
{"status": "healthy", "demo_mode": false}
```

### **Test UI**

Apri browser: `https://your-app.railway.app`

✅ Dovresti vedere la UI React
✅ Login con Google dovrebbe funzionare

---

## 🐛 Troubleshooting Veloce

| Problema | Soluzione |
|----------|-----------|
| Build fails | Verifica che `frontend/package.json` abbia `"engines": {"node": ">=18"}` |
| 404 su tutte le route | Redeploy: Settings → Redeploy |
| DB readonly error | Verifica volume montato su `/app/data` |
| OAuth redirect error | Aggiorna redirect URI su Google Cloud Console con domain esatto |

---

## 💡 Tips

**View Logs:**
```
Railway Dashboard → Deployments → View Logs
```

**Redeploy:**
```
Settings → Redeploy (dopo modifiche env vars)
```

**Custom Domain:**
```
Settings → Domains → Add Domain
```

---

## 📞 Support

- Documentazione completa: `RAILWAY_DEPLOYMENT.md`
- Railway Docs: https://docs.railway.app
- Issue? Apri GitHub issue

---

**✨ Fatto! Il tuo dashboard è live in 5 minuti.**
