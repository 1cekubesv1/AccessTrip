# Going live with the real phone call (Flow B)

The demo runs fully offline with the scripted call. To ring a **real phone** on
stage, you need a Vapi account, a French voice assistant, an ngrok tunnel, and a
teammate's number. Do this once, ideally the day before.

Everything below is the only part I can't do for you — it needs your accounts.

---

## 1. Vapi account + assistant (~15 min)

1. Sign up at **vapi.ai** and grab your **API key** (Dashboard → API Keys) → `VAPI_API_KEY`.
2. **Buy or import a phone number** (Dashboard → Phone Numbers). Copy its ID → `VAPI_PHONE_NUMBER_ID`.
3. **Create an assistant** with a French voice (ElevenLabs or Azure FR). Paste this
   as its **system prompt** (verbatim from the spec):

   > Tu es l'assistante vocale d'AccessTrip, appelant au nom de [Assureur] pour Mme
   > Camille Moreau. Objectif: re-confirmer la réservation de la chambre 104
   > accessible (douche à l'italienne, référence BR-104-ACC) pour le 12 septembre.
   > Sois brève, polie, professionnelle. Annonce en début d'appel que tu es une
   > assistante automatisée et que l'appel est enregistré. Obtiens: la chambre
   > est-elle bien réservée, le nom de ton interlocuteur, une référence. Si la
   > chambre n'est plus disponible: reste calme, demande quelles alternatives
   > accessibles existent, indique qu'un conseiller va rappeler, remercie. Ne
   > raccroche jamais sans avoir reformulé ce qui a été dit.

   Copy the assistant ID → `VAPI_ASSISTANT_ID`.

4. Set the **teammate's real phone number** (E.164, e.g. `+336XXXXXXXX`) → `RECEPTIONIST_PHONE`.

## 2. ngrok tunnel (so Vapi can reach the webhook)

```bash
brew install ngrok           # if not installed
ngrok config add-authtoken <token from ngrok.com dashboard>
ngrok http 3000              # keep this running during the demo
```

Copy the `https://xxxx.ngrok-free.app` URL → `PUBLIC_URL`. The server exposes the
webhook at `${PUBLIC_URL}/webhooks/vapi` and passes it to Vapi automatically on
each call.

> Also set this same URL as the assistant's **Server URL** in the Vapi dashboard,
> as a fallback in case the per-call override doesn't apply.

## 3. Fill `.env` and restart

Put the five `VAPI_*` values + `PUBLIC_URL` into `AccessTrip/.env`, then:

```bash
npm run start        # or npm run dev
```

On boot, `hasVapi()` becomes true and `POST /api/call/start` places a real call
instead of the simulation.

## 4. Rehearse the receptionist (3 branches)

The teammate answering the phone rehearses all three, per the spec:

- **B1 happy:** confirms room 104, gives the name "Mme Laurent".
- **B2 stage branch (play this on stage):** "Ah… la 104 a été réattribuée, nous
  n'avons plus de chambre accessible ce soir-là." Polite, slightly embarrassed,
  offers nothing → triggers the failure + Hôtel Aston recovery.
- **B3 evasive:** "il faudrait voir avec ma collègue demain" → tests the red-flag path.

## 5. The invisible insurance

If the live call fails on stage (network, Vapi, ngrok drop), the `/demo` panel's
**"Lancer l'appel IA — scénario scène"** button plays the identical scripted call
over the same pipeline, and **Contrôles de secours** can force any step's status
by hand. Nothing on stage can hard-break.

---

**What I still need from you to verify the live call end-to-end:** the `VAPI_*`
keys, the teammate's number, and a running ngrok tunnel. Give me those (or run
the steps above) and I'll test a real call.
