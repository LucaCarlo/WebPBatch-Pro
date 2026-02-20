# WebPBatch Pro

**Convertitore batch di immagini professionale** per Windows e macOS. Converti, comprimi e ottimizza centinaia di immagini in un click con supporto WebP, AVIF, JPG e PNG.

![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron&logoColor=white)
![Sharp](https://img.shields.io/badge/Sharp-0.34-99CC00?logo=sharp&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

---

## Funzionalita

### Conversione Multi-Formato
- **WebP** - Formato moderno Google con compressione superiore
- **AVIF** - Formato di ultima generazione basato su AV1
- **JPG** - Compatibilita universale
- **PNG** - Qualita lossless con trasparenza
- Modalita **Lossless** per WebP, AVIF e PNG

### Elaborazione Batch
- Drag & drop di file e cartelle
- Scansione automatica delle sottocartelle
- Elaborazione parallela multi-thread (1, 2, 4, 8 thread o Auto)
- Barra di avanzamento in tempo reale con pausa/riprendi/annulla
- Filtro file per nome nella lista

### Preview Confronto Side-by-Side
- Anteprima originale vs convertita con slider interattivo
- Informazioni dettagliate su dimensioni, peso e risparmio percentuale
- Visualizzazione in tempo reale della qualita

### Assistente AI Integrato
Supporto per tre provider AI:
- **Anthropic Claude** (Claude Sonnet)
- **OpenAI GPT** (GPT-4o Mini)
- **Google Gemini** (Gemini 2.0 Flash)

Funzionalita AI:
- **Suggerimento Impostazioni**: Descrivi il tuo caso d'uso (es. "foto prodotti per Shopify") e l'AI suggerisce le impostazioni ottimali
- **Generazione Alt Text**: Alt text SEO-friendly generato automaticamente dall'AI
- **Generazione Metadata SEO**: Title, description, keywords generati dall'analisi dell'immagine

### Smart Mode
- Ottimizzazione automatica con soglia minima di risparmio
- Target peso massimo configurabile (es. max 200KB per immagine)
- Salta automaticamente i file che non beneficerebbero della conversione

### Ridimensionamento Avanzato
- **Lato lungo**: Ridimensiona in base al lato piu lungo (600px - 2400px o custom)
- **Personalizzato**: Larghezza e altezza custom con mantenimento proporzioni
- **Crop**: Ritaglio dal centro con dimensioni precise
- **Sharpen**: Nitidezza automatica dopo il resize

### Watermark
- **Testo**: Font size, colore, stroke personalizzabili
- **Immagine**: Sovrapponi un PNG come watermark
- 7 posizioni disponibili (angoli, centri, centro)
- Opacita e margine configurabili

### Gestione Metadata/EXIF
- Rimozione completa dei metadata
- **Privacy Mode**: Rimuovi solo dati GPS mantenendo orientamento
- Mantieni profilo colore ICC

### Preset Pronti all'Uso
Preset ottimizzati per ogni piattaforma:

| Preset | Formato | Qualita | Dimensione |
|--------|---------|---------|------------|
| Web (WebP) | WebP | 80% | 1920px |
| E-commerce | WebP | 82% | 2048px |
| Instagram | JPG | 85% | 1080px |
| Facebook Post | JPG | 85% | 1200px |
| Twitter/X Post | JPG | 85% | 1600px |
| LinkedIn Post | JPG | 85% | 1200px |
| Pinterest Pin | JPG | 80% | 1000px |
| Shopify Product | WebP | 82% | 2048px |
| WordPress Blog | WebP | 80% | 1200px |

- Salva, esporta e importa preset personalizzati

### Watch Folder
- Monitoraggio cartella automatico
- Le nuove immagini vengono convertite automaticamente
- Notifiche in tempo reale

### Naming Template
Variabili disponibili per il nome dei file di output:
- `{name}` - Nome originale
- `{w}` - Larghezza
- `{h}` - Altezza
- `{date}` - Data
- `{counter}` - Contatore

### Gestione Duplicati
- **Rinomina**: Aggiunge suffisso (-001, -002...)
- **Salta**: Non sovrascrive i file esistenti
- **Sovrascrivi**: Sovrascrive senza chiedere

### Report e Statistiche
- Report dettagliato post-conversione con statistiche
- Esportazione CSV del report
- Log completo copiabile negli appunti

### Interfaccia
- Tema chiaro e scuro con toggle (Ctrl+D)
- Lista file con thumbnail, tipo, dimensioni, stato
- Colonne ordinabili per nome e peso
- Scorciatoie tastiera complete

---

## Scorciatoie Tastiera

| Scorciatoia | Azione |
|-------------|--------|
| `Ctrl+O` | Sfoglia file |
| `Ctrl+Enter` | Avvia conversione |
| `Ctrl+Shift+Del` | Svuota lista |
| `Ctrl+D` | Tema chiaro/scuro |
| `Esc` | Chiudi modale |

---

## Installazione

### Requisiti
- Node.js 18 o superiore
- npm 8 o superiore

### Setup Development
```bash
git clone https://github.com/LucaCarlo/WebPBatch-Pro.git
cd WebPBatch-Pro
npm install
npm start
```

### Build
```bash
# Windows
npm run build:win

# macOS
npm run build:mac
```

I file di distribuzione saranno generati nella cartella `dist/`.

---

## Stack Tecnologico

- **[Electron 40](https://www.electronjs.org/)** - Framework desktop cross-platform
- **[Sharp 0.34](https://sharp.pixelplumbing.com/)** - Libreria di elaborazione immagini ad alte prestazioni
- **HTML/CSS/JS** - Interfaccia nativa senza framework esterni
- **API AI** - Integrazione con Anthropic Claude, OpenAI GPT, Google Gemini

---

## Struttura Progetto

```
WebPBatch-Pro/
├── main.js              # Main process Electron
├── preload.js           # Bridge IPC sicuro
├── launch.js            # Launcher script
├── package.json
├── lib/
│   ├── scanner.js       # Scansione file immagine
│   ├── converter.js     # Conversione con Sharp
│   ├── processor.js     # Coda di elaborazione
│   ├── naming.js        # Template nomi output
│   ├── presets.js       # Gestione preset
│   ├── watcher.js       # Watch folder
│   ├── logger.js        # Sistema di logging
│   ├── license.js       # Gestione licenza
│   └── ai-provider.js   # Astrazione provider AI
├── presets/              # Preset JSON predefiniti
├── src/
│   ├── index.html       # Interfaccia principale
│   ├── assets/          # Logo e risorse
│   ├── styles/
│   │   ├── main.css     # Stili principali + tema scuro
│   │   └── components.css # Componenti UI
│   └── js/
│       ├── app.js       # Entry point frontend
│       ├── state.js     # Stato applicazione
│       ├── settings.js  # Pannello impostazioni
│       ├── filelist.js  # Lista file con thumbnail
│       ├── queue.js     # Controller conversione
│       ├── dragdrop.js  # Drag & drop handler
│       ├── report.js    # Report post-conversione
│       ├── preview.js   # Preview confronto slider
│       ├── theme.js     # Toggle tema chiaro/scuro
│       ├── presets.js   # UI gestione preset
│       ├── watermark.js # UI watermark
│       ├── ai-assistant.js # UI assistente AI
│       └── utils.js     # Utility condivise
└── build/               # Risorse per il build
```

---

## Formati Supportati

### Input
JPG, JPEG, PNG, WebP, AVIF, GIF, TIFF, TIF, BMP

### Output
WebP, AVIF, JPG, PNG

---

## Licenza

Software proprietario. Tutti i diritti riservati.

---

Sviluppato con Electron e Sharp.
