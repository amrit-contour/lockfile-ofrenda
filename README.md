# Lockfile Ofrenda

A Día de los Muertos altar for the quiet packages in **your** npm lockfile.

Source: [github.com/amrit-contour/lockfile-ofrenda](https://github.com/amrit-contour/lockfile-ofrenda)

`npm outdated` tells you that you froze a version. It does not tell you that the registry has not heard from that package in years, or that the maintainer marked it deprecated and you still pull it in transitively. This app reads `package-lock.json`, asks the public npm registry for last publish / deprecated / maintainers, and lights a candle for anything unpublished, deprecated, silent for two years, or listed with no maintainers.

A local **Gemma** model (via Ollama) may write a remembrance. Code then checks the text against the record. Invented years and wanderings are dropped. If Gemma is offline or fails the check, you get a clerk’s copy of the registry fields instead.

## Why open weights

The lockfile is a map of what you ship. Sending it to a hosted chat API is a worse deal than reading `registry.npmjs.org` yourself. Gemma runs on your machine. The only network the scan needs is the public registry.

## Run

```bash
cp .env.example .env
npm install
# optional, for spoken remembrances instead of the clerk copy:
ollama serve
ollama pull gemma3:4b
npm start
```

Open `http://localhost:8788`. Use the demo lockfile, or drop your own `package-lock.json`.

```bash
npm test
npm run typecheck
```

## What counts as a ghost

| Signal | Source |
|---|---|
| Unpublished | registry HTTP 404 |
| Deprecated | `deprecated` on the locked or latest version |
| Silent | latest publish older than 730 days |
| No maintainers | empty `maintainers` on a still-published package |

We do **not** invent CVEs. Quiet is not the same as vulnerable.

Snuffing a candle hides that package for the session. The model is not asked about it again.

## Deploy

`render.yaml` starts the web service. Point `OLLAMA_BASE_URL` at a host that can reach Ollama if you want Gemma in production; without it, remembrances fall back to the registry record.

## Challenge notes

Built for [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26).

Prize category claimed: Best Use of Gemma. Open-weight inference is the core of the remembrance. `render.yaml` is there if you want a host; this submission does not claim a Render prize without a live Render service.
