---
name: ui-brand-color-system
description: Standarder for fargebruk, modusskiller og signaturfarger i Curiosa. Emerald/Brand er hovedfarge for prøver og primærhandlinger, mens Indigo er reservert for øvingsoppgaver.
---

# Retningslinjer for fargehierarki og modusskiller i Curiosa

I Curiosa har farger streng semantisk betydning. Dette sikrer at lærere og elever umiddelbart forstår om de befinner seg i en reell vurderings-/prøvesituasjon eller i et formativt øvingsmodus, samt hva som er hovedhandlingen.

---

## 1. Emerald / Brand-grønn (`#10b981` / `#16a34a`) – Curiosas Signaturfarge

**Emerald / Brand** representerer:
* Primære handlingsknapper (Lagre, Publiser, Start prøve, Opprett).
* Prøver, tester og formelle vurderinger (vurderingsmodus).
* Vurderte og godkjente tilstander (fullført retting, «Alt ferdig rettet», publisert resultat).
* Suksess- og bekreftelsestilstander.

### Fargeklasser
* **Knapper (primær aktiv):** `bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20` eller `bg-brand-500 hover:bg-brand-600 text-white`.
* **Subtile merker og tags (lys modus):** `bg-emerald-100 text-emerald-800 border-emerald-300`.
* **Subtile merker og tags (mørk modus):** `dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20`.
* **Ikoner og tekst:** `text-emerald-600 dark:text-emerald-400`.

---

## 2. Indigo / Lilla-blå (`#6366f1` / `#4f46e5`) – Øvingsmodus

**Indigo** er strengt reservert for:
* Formative øvingsoppgaver («Øving», øvingsmodus, repetisjon).
* Fagstoff og presentasjoner knyttet til øving.
* Elevfremdrift og mestringskart under øving.
* Øvingsfanen i analyser og varmekart.

### Fargeklasser
* **Knapper (aktiv i øvingsmodus):** `bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20`.
* **Subtile merker og tags (lys modus):** `bg-indigo-100 text-indigo-800 border-indigo-300`.
* **Subtile merker og tags (mørk modus):** `dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20`.
* **Ikoner og tekst:** `text-indigo-600 dark:text-indigo-400`.

> [!IMPORTANT]
> Bland aldri Indigo inn i formelle prøver, og bruk aldri tilfeldige blåfarger der en handling tilhører prøvevurdering. Prøve = Emerald/Brand. Øving = Indigo.

---

## 3. Sekundære og nøytrale kontroller

Når knapper ikke er den primære aksjonen (f.eks. «Eksporter for Teams», «Anonym retting» når den er av, «Avbryt»):
* **Mørk modus base:** `bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80`.
* **Lys modus base:** `bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200`.
* **Deaktivert (`disabled`):** `bg-slate-900/60 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-50 select-none`.
* **Hover:** Skal aldri vaske ut teksten, men gi en diskret heving med tilhørende fokus- eller aksentglød.

---

## 4. Andre etablerte aksenter

* **Orange / Rav:** Reservert for kartleggingsprøver (`mappingBokmal`), ubehandlede/ventende oppgaver («Må vurderes»), og juksevarsler.
* **Red:** Reservert for destruktive handlinger (Slett), sperrede elever, og fusk-hendelser.
* **Rosa (Live):** Reservert for CurioLive (sanntidsmonitor og sanntidsquiz).
