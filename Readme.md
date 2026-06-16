# SSL10n Localization Guide

This is a localization solution for beatsaber quest mods.
<!--

Crowdin is an awesome translate platform! We have a mod translate project there. 

Translate contributors from the crowdin project:  
![svg](https://frto027.github.io/ssl10n.csv/crowdin_contributors.svg) -->

## For Player

Install [Loqolizer](https://github.com/BeatSaberCN/Loqolizer) to enable mods localize. The mod has a snapshot of translate texts in release time.

Online resource update have not yet been developed. You will need to update the mod version to load new translate data.

## For Translator

The mod string can be translated at [the SiraLocalizer's Crowdin Project](https://crowdin.com/project/siralocalizer). 

Translate there, then your string will be automatically synchronized to the Loqolizer mod.

## For Modder
Follow this guide to add localization support for your mod.

- use the qpm library `sslocalization`, [see here](https://github.com/frto027/SimpleStupidLocalization). load your own csv file.
- Just add your mod to [src/mods.ts](/src/mods.ts) and open a pull request. Then Loqolizer mod will automatically translate your keys.

Optional:
- If you'd like translate your mod by your self, just add the translated string in your mods. Loqolizer mod not required, it's depends on you.

----

# ssl10n.csv

this repo generates csv file for each bs mods

this is a nodejs project. see `package.json` for avaliable scripts...

# Repo output

[web page](https://frto027.github.io/ssl10n.csv/index.html)

api: [manifest.json](https://frto027.github.io/ssl10n.csv/manifest.json), the json format is [RemoteManifestMods](src/RemoteMods.ts)

# Repo input

Just add your mod to [src/mods.ts](/src/mods.ts) and open a pull request.

Everything else will be automatic.

This repo auto sync csv files to crowdin everyday.

see [Crowdin.md](./Crowdin.md) to learn how to setup another crowndin project by your self.

# License

This project is developed under MIT License  

the csv files in `/mods` are NOT licenced, because they're owned by other mods. see licence file for their own mods.

If you add a URL to this repository, we consider this means you grant us the translation rights.
