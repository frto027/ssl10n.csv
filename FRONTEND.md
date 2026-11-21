# Frontend development

The React + TypeScript frontend lives in `src/web/` and uses Vite.

- `npm install`: install dependencies.
- `npm run dev`: start the frontend with hot reload. Existing files in `web_root/`, including `manifest.json` and protobuf snapshots, are served locally; no Crowdin credentials are needed.
- `npm run build:web`: type-check and build the frontend into `web_root/`, preserving translation data.
- `npm run preview`: preview the built site locally after building.
- `npm run gen_page`: build the frontend, then run the existing Crowdin snapshot generation (requires Crowdin access).

Edit `src/web/index.html` rather than the generated `web_root/index.html`.
Browser TypeScript settings are in `tsconfig.web.json`; Node scripts continue to use `tsconfig.json`.
Assets use relative URLs so the build can be deployed under the GitHub Pages repository path.

Interface translations live in `src/web/langs/zh.ts` and `src/web/langs/en.ts`.
Both pages provide an EN/中文 switch. The selection is stored under
`ssl10n.language` in localStorage and synchronized between open tabs.
On the first visit, the first supported language in the browser's preferred
languages is used (Chinese or English), falling back to English.
CSV content and snapshot announcements are shown as provided by the protobuf;
switching the interface language only changes labels and formatting.

The homepage loads the raw `.protobuf` snapshot referenced by `manifest.json`,
or parses a selected local `.protobuf` file in the browser. Each mod version
opens `index.html?csv=mods/<encoded-mod-id>/<version-index>.csv`
in a new tab, displaying the original CSV as an HTML table. Base game translations
use `csv=base-game.csv`. The preview reads the current protobuf from localStorage
and refreshes expired online data as described below, so it can be refreshed
after closing the homepage. It displays the filename,
timestamp, and modsHashes of the currently stored file without consistency checks.

The `pcMods` map is displayed separately as PC Mods, with one preview per ID.
PC mod CSVs use the virtual path `pc-mods/<encoded-mod-id>.csv`; they do not
have version metadata. Snapshots containing only PC mods are supported.

Uploaded protobuf bytes (Base64) and the filename are stored together in
localStorage under the fixed key `ssl10n.uploadedProtobuf`. The homepage restores
this file in preference to the online snapshot after checking the manifest. Its top banner has a Clear button that
removes the saved file and downloads the latest manifest; Load latest manifest
does the same. Invalid files or storage write failures do not replace the saved file.
Online protobuf files are stored separately under the fixed key
`ssl10n.onlineProtobuf`, so previewing online data does not replace the upload.
The preview uses the uploaded file whenever `ssl10n.uploadedProtobuf` is nonempty;
otherwise it reads the online file. URL parameters do not choose the source.

Every homepage and CSV preview load first downloads `manifest.json` with a
current `time=<timestamp>` query parameter. If an upload is saved, it remains
the active file. Otherwise, the online cache is reused only when its saved
filename matches the filename in `protobufSnapshotBinaryUrl`; a different
filename, missing cache, or corrupt data triggers a protobuf download.
There is no two-hour expiry. Load latest manifest performs the same filename
check after clearing the upload.

The online record stores the protobuf filename in `name` and its successful
download time in `loadedAt` (milliseconds). Protobuf requests do not add a time
parameter. All requests use `cache: "no-cache"`. Failed or cancelled downloads
do not overwrite the last saved online record. There is no periodic background
refresh.
