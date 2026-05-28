export interface LocalizedModNames{
    English?:string
    French?:string
    Spanish?:string
    German?:string
    Italian?:string
    Portuguese_Brazil?:string
    Portuguese?:string
    Russian?:string
    Greek?:string
    Turkish?:string
    Danish?:string
    Norwegian?:string
    Swedish?:string
    Dutch?:string
    Polish?:string
    Finnish?:string
    Japanese?:string
    Simplified_Chinese?:string
    Traditional_Chinese?:string
    Korean?:string
    Czech?:string
    Hungarian?:string
    Romanian?:string
    Thai?:string
    Bulgarian?:string
    Hebrew?:string
    Arabic?:string
    Bosnian?:string
}

export interface ManifestVersionSource{
    version:string,
    key_prefix:string,
    csv_url:string,
    csv_local:string,
    crowdin_sync_file?:string,
    disable_csv_downlad?:boolean
}

export interface ManifestModInfo{
    name?:LocalizedModNames | string,
    datas:Array<ManifestVersionSource>,
}

export type ManifestMods = Record<string /* mod id */, ManifestModInfo>

export const WEB_ROOT = "https://frto027.github.io/ssl10n.csv"

export const ModDatabase:ManifestMods = {
    "Loqolizer" /* this is mod id */ : {
        name: "Loqolizer",
        datas: [
            // you can specify multiple csv file for different mod versions
            {
                version: "*",
                // this is csv file from your mod repo
                csv_url: "https://raw.githubusercontent.com/BeatSaberCN/Loqolizer/refs/heads/master/assets/localize.csv",
                key_prefix: "LOQOLIZER_", // your every key must starts with this key_prefix, or the key_prefix will be added before your key.
                // your csv file will be downloaded to this repo's csv_local file
                csv_local: "mods/Loqolizer.csv",
                // you don't need add crowdin_sync_file. This should be updated by crowdin maintainers. The file will be auto uploaded at next sync timing.
                crowdin_sync_file:"Loqolizer.csv",
            }
        ]
    },
    /* add more mods here */
}
