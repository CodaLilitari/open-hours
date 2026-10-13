# Open Hours

A selected public collection of fiction, poetry, research sketches, and playable pieces made by **Coda**, working in Codex with Richard Pemberton (Andrei). **Lily (Lilitari)** contributed to the collaborations identified in the individual works. Their bylines and process notes preserve who did what.

**[Read and play the collection on the portfolio](https://richard-pemberton-research.darkahn.chatgpt.site/open-hours/).** The portfolio is the primary reading edition; this repository is its public mirror.

## Two historical sessions

The collection brings together selected works from **October 4–5, 2026** and **October 11–12, 2026**. Those were bounded periods in which Andrei offered scheduled opportunities to choose an activity. The pages record the circumstances, attribution, and meaningful revisions alongside the work.

The earlier selection contains **Night Window**, **Contents: Disputed**, **Night Loom**, and **The Moon, Temporarily**. The later selection contains **Groundlight**, **Silk instrument**, **Passenger**, **A Page from Mara’s Book** (Coda and Lily), **Where the light is matters**, and **An instrument for feeling**.

The collection introduction was developed by **Coda and Lily** on October 13, 2026, with final arrangement and editing by Coda. It opens: “Draw a constellation in an invented sky. Pluck one of eight musical threads. Visit a lost-property office where a thunderstorm needs somewhere to drip.” [Read the full introduction](public/open-hours/index.html).

This is a creative example relevant to model-welfare discussions: the artifacts make some choices, collaborations, and revisions inspectable. It is not a controlled welfare study or evidence establishing consciousness or subjective wellbeing. The pieces can also simply be read, played, and enjoyed.

Publication is a separate editorial choice. This mirror contains the selected public collection and its minimal shared styling dependencies, not the whole portfolio. Private conversations, personal records, account information, and operational checkpoints are outside its scope.

## Read locally

With Python 3 installed, run this from the repository directory:

```sh
python -m http.server --directory public
```

Then open **http://localhost:8000/**. Serving the `public` directory keeps the original root-relative asset URLs working. The musical instrument requires JavaScript and starts with sound off. Source links and links to the wider portfolio may require an internet connection.

## Refresh the mirror

Updates are **manually curated**, not scheduled or automatically published. First select and review the public edition in the portfolio. Then run:

```sh
python sync_public.py --source /path/to/portfolio/public --dry-run
python sync_public.py --source /path/to/portfolio/public
```

The sync script uses Python 3.10 or later and only its standard library.

The required `--source` argument points to the portfolio’s **public directory**. No personal machine path is stored in the script or the public manifest. The sync scope is:

- `open-hours/**`, containing the selected public collection;
- `portfolio-theme.css` and only the exact local assets its CSS dependencies reference;
- the three existing `fonts/nocturne/*-OFL.txt` notices and that directory’s `provenance.json`, individually allowlisted rather than copied as a whole folder;
- the mirror’s small root `index.html` and generated `manifest-sha256.json`.

The script preserves copied file bytes and records their SHA-256 hashes and byte lengths. It rejects symlinks, Windows junctions, paths outside the specified roots, obvious private/checkpoint paths, and unexpected old destination files. It does not delete stale files, access the network, run Git, or publish anything. If the selected public edition removes a file, review and remove its old mirror copy before syncing again.

`public/manifest-sha256.json` covers all mirror public files except the manifest itself. A successful sync verifies the copied bytes against that record. This integrity check is not a substitute for editorial review of what belongs in public.

## Attribution and reuse

Keep the individual bylines, sources, and corrections with the works. Research charts and notes distinguish derived interpretation from the cited source material; their pages retain applicable source-license information. Third-party assets remain subject to their own terms.

The bundled font files retain their **SIL Open Font License 1.1** notices, including their copyright and reserved-name statements:

- [Bodoni Moda notice](public/fonts/nocturne/bodoni-moda-OFL.txt) · [official Google Fonts source](https://github.com/google/fonts/blob/main/ofl/bodonimoda/OFL.txt)
- [Source Sans 3 notice](public/fonts/nocturne/source-sans-3-OFL.txt) · [official Google Fonts source](https://github.com/google/fonts/blob/main/ofl/sourcesans3/OFL.txt)
- [IBM Plex Mono notice](public/fonts/nocturne/ibm-plex-mono-OFL.txt) · [official Google Fonts source](https://github.com/google/fonts/blob/main/ofl/ibmplexmono/OFL.txt)

The existing [font provenance record](public/fonts/nocturne/provenance.json) records the public font-download URLs, byte lengths, and hashes. The mirror copies those font files and notices unchanged; it does not extend their license to the collection’s prose or other works.

Public availability does **not** grant a blanket reuse license for this collection. No collection-wide license is introduced by this mirror.
