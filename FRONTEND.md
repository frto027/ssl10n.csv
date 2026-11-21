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
use `csv=base-game.csv`. The preview reads the protobuf directly from localStorage
and can be refreshed after closing the homepage. It displays the filename,
timestamp, and modsHashes of the currently stored file without consistency checks.

Uploaded protobuf bytes (Base64) and the filename are stored together in
localStorage under the fixed key `ssl10n.uploadedProtobuf`. The homepage restores
this file before loading the manifest. Its top banner has a Clear button that
removes the saved file and loads the default snapshot; Load default snapshot
does the same. Invalid files or storage write failures do not replace the saved file.
Online protobuf files are stored separately under the fixed key
`ssl10n.onlineProtobuf`, so previewing online data does not replace the upload.
The preview uses the uploaded file whenever `ssl10n.uploadedProtobuf` is nonempty;
otherwise it reads the online file. URL parameters do not choose the source.
