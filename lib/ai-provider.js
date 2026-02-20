const https = require('https');
const http = require('http');

/**
 * AI Provider abstraction for Anthropic Claude, OpenAI GPT, Google Gemini
 */
class AIProvider {
  constructor(provider, apiKey) {
    this.provider = provider; // 'anthropic' | 'openai' | 'google'
    this.apiKey = apiKey;
  }

  /**
   * Make HTTPS request
   */
  _request(options, body) {
    return new Promise((resolve, reject) => {
      const proto = options.port === 80 ? http : https;
      const req = proto.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            reject(new Error('Risposta AI non valida: ' + data.slice(0, 200)));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Timeout: l\'AI non ha risposto in tempo'));
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  /**
   * Suggest optimal settings based on user description
   */
  async suggestSettings(description) {
    const systemPrompt = `Sei un esperto di ottimizzazione immagini. L'utente descrive il suo caso d'uso.
Rispondi SOLO con JSON valido (nessun testo aggiuntivo, nessun markdown) con questa struttura:
{
  "settings": {
    "format": "webp|jpg|png",
    "quality": 75,
    "resizeMode": "none|long-edge|custom",
    "longEdge": 1920,
    "resizeWidth": null,
    "resizeHeight": null,
    "sharpen": false,
    "stripMetadata": true,
    "lossless": false
  },
  "reasoning": "Spiegazione breve in italiano del perche' queste impostazioni sono ottimali",
  "tips": ["Consiglio 1", "Consiglio 2"]
}

Linee guida:
- Instagram: JPG 85%, 1080px lato lungo, strip metadata
- Facebook: JPG 85%, 1200px, strip metadata
- Twitter/X: JPG 85%, 1600px
- Pinterest: JPG 80%, 1000px largo
- E-commerce (Shopify/WooCommerce): WebP 82%, 2048px, sharpen true
- Web generico: WebP 80%, 1920px
- Email/Newsletter: JPG 75%, 600px
- Stampa: PNG lossless, nessun resize, mantieni metadata
- Hero/Banner: WebP 85%, 2400px
- Thumbnail: JPG 75%, 300px
- Se non sei sicuro, usa WebP 80% 1920px come default`;

    return this._chat(systemPrompt, description);
  }

  /**
   * Generate alt text for an image
   */
  async generateAltText(imageBase64, context) {
    const systemPrompt = `Sei un esperto SEO. Genera un alt text ottimale per l'immagine.
Rispondi SOLO con JSON valido:
{
  "altText": "Descrizione concisa e SEO-friendly dell'immagine (max 125 caratteri)",
  "altTextEn": "Same description in English"
}
Il testo deve essere:
- Descrittivo ma conciso
- Includere parole chiave rilevanti
- Non iniziare con "Immagine di" o "Image of"
- Utile per screen reader e SEO`;

    const userMessage = context
      ? `Contesto: ${context}\n\nAnalizza l'immagine e genera l'alt text.`
      : 'Analizza l\'immagine e genera l\'alt text ottimale per SEO.';

    return this._chatWithImage(systemPrompt, userMessage, imageBase64);
  }

  /**
   * Generate SEO metadata for an image
   */
  async generateMetadata(imageBase64, context) {
    const systemPrompt = `Sei un esperto SEO e metadata. Analizza l'immagine e genera metadata completi.
Rispondi SOLO con JSON valido:
{
  "title": "Titolo SEO (max 60 char)",
  "description": "Meta description (max 160 char)",
  "altText": "Alt text (max 125 char)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": "Categoria dell'immagine",
  "suggestedFileName": "nome-file-seo-friendly"
}`;

    const userMessage = context
      ? `Contesto: ${context}\n\nAnalizza l'immagine e genera i metadata SEO completi.`
      : 'Analizza l\'immagine e genera metadata SEO completi.';

    return this._chatWithImage(systemPrompt, userMessage, imageBase64);
  }

  /**
   * Chat (text only)
   */
  async _chat(systemPrompt, userMessage) {
    switch (this.provider) {
      case 'anthropic': return this._anthropicChat(systemPrompt, userMessage);
      case 'openai': return this._openaiChat(systemPrompt, userMessage);
      case 'google': return this._googleChat(systemPrompt, userMessage);
      default: throw new Error('Provider AI non supportato: ' + this.provider);
    }
  }

  /**
   * Chat with image (vision)
   */
  async _chatWithImage(systemPrompt, userMessage, imageBase64) {
    switch (this.provider) {
      case 'anthropic': return this._anthropicVision(systemPrompt, userMessage, imageBase64);
      case 'openai': return this._openaiVision(systemPrompt, userMessage, imageBase64);
      case 'google': return this._googleVision(systemPrompt, userMessage, imageBase64);
      default: throw new Error('Provider AI non supportato: ' + this.provider);
    }
  }

  // ─── ANTHROPIC ───

  async _anthropicChat(systemPrompt, userMessage) {
    const res = await this._request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      }
    }, {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    if (res.status !== 200) {
      throw new Error('Anthropic API errore: ' + (res.data.error?.message || JSON.stringify(res.data)));
    }

    const text = res.data.content[0].text;
    return this._parseJSON(text);
  }

  async _anthropicVision(systemPrompt, userMessage, imageBase64) {
    const mediaType = this._detectMediaType(imageBase64);
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const res = await this._request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      }
    }, {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          { type: 'text', text: userMessage }
        ]
      }]
    });

    if (res.status !== 200) {
      throw new Error('Anthropic API errore: ' + (res.data.error?.message || JSON.stringify(res.data)));
    }

    const text = res.data.content[0].text;
    return this._parseJSON(text);
  }

  // ─── OPENAI ───

  async _openaiChat(systemPrompt, userMessage) {
    const res = await this._request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey
      }
    }, {
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    });

    if (res.status !== 200) {
      throw new Error('OpenAI API errore: ' + (res.data.error?.message || JSON.stringify(res.data)));
    }

    const text = res.data.choices[0].message.content;
    return this._parseJSON(text);
  }

  async _openaiVision(systemPrompt, userMessage, imageBase64) {
    const res = await this._request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey
      }
    }, {
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageBase64, detail: 'low' } },
            { type: 'text', text: userMessage }
          ]
        }
      ]
    });

    if (res.status !== 200) {
      throw new Error('OpenAI API errore: ' + (res.data.error?.message || JSON.stringify(res.data)));
    }

    const text = res.data.choices[0].message.content;
    return this._parseJSON(text);
  }

  // ─── GOOGLE GEMINI ───

  async _googleChat(systemPrompt, userMessage) {
    const res = await this._request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 1024 }
    });

    if (res.status !== 200) {
      throw new Error('Google AI errore: ' + (res.data.error?.message || JSON.stringify(res.data)));
    }

    const text = res.data.candidates[0].content.parts[0].text;
    return this._parseJSON(text);
  }

  async _googleVision(systemPrompt, userMessage, imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = this._detectMediaType(imageBase64);

    const res = await this._request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Data } },
          { text: userMessage }
        ]
      }],
      generationConfig: { maxOutputTokens: 1024 }
    });

    if (res.status !== 200) {
      throw new Error('Google AI errore: ' + (res.data.error?.message || JSON.stringify(res.data)));
    }

    const text = res.data.candidates[0].content.parts[0].text;
    return this._parseJSON(text);
  }

  // ─── NEW: AI Compression Intelligence ───

  async analyzeForCompression(imageBase64) {
    const systemPrompt = `Sei un esperto di compressione immagini. Analizza l'immagine e determina il tipo e le impostazioni ottimali.
Rispondi SOLO con JSON valido:
{
  "imageType": "photo|screenshot|graphic|ecommerce|illustration|text-heavy",
  "format": "webp|jpg|avif|png",
  "quality": 80,
  "sharpen": false,
  "lossless": false,
  "reasoning": "Breve spiegazione in italiano"
}
Linee guida:
- Foto naturali: WebP/AVIF 75-85%, sharpen false
- Screenshot/testo: PNG lossless o WebP 90%+
- Grafica/illustrazione: WebP 85%
- E-commerce prodotto: WebP 82%, sharpen true
- Immagini con gradienti: qualita alta per evitare banding
- Usa il formato che offre il miglior rapporto qualita/peso`;

    return this._chatWithImage(systemPrompt, 'Analizza questa immagine per la compressione ottimale.', imageBase64);
  }

  // ─── NEW: AI Subject Detection ───

  async detectSubjectRegion(imageBase64) {
    const systemPrompt = `Analizza l'immagine e identifica il soggetto principale (persona, volto, oggetto, prodotto).
Rispondi SOLO con JSON valido:
{
  "x": 25,
  "y": 10,
  "w": 50,
  "h": 70,
  "type": "person|face|product|food|animal|object|landscape"
}
I valori x, y, w, h sono PERCENTUALI (0-100) dell'immagine totale:
- x: distanza dal bordo sinistro in %
- y: distanza dal bordo superiore in %
- w: larghezza del soggetto in %
- h: altezza del soggetto in %
Sii preciso nell'identificare il bounding box del soggetto principale.`;

    return this._chatWithImage(systemPrompt, 'Identifica il soggetto principale e la sua posizione.', imageBase64);
  }

  // ─── HELPERS ───

  _parseJSON(text) {
    // Try direct parse
    try {
      return JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code block
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        return JSON.parse(match[1].trim());
      }
      // Try finding JSON object in text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Impossibile interpretare la risposta AI');
    }
  }

  _detectMediaType(base64) {
    if (base64.startsWith('data:image/png')) return 'image/png';
    if (base64.startsWith('data:image/webp')) return 'image/webp';
    if (base64.startsWith('data:image/gif')) return 'image/gif';
    return 'image/jpeg';
  }
}

module.exports = { AIProvider };
