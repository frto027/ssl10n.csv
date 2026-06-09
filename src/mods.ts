export interface ManifestVersionSource{
    version:string,
    key_prefix:string,
    csv_url:string,
    csv_local:string,
    crowdin_sync_file?:string,
    disable_csv_downlad?:boolean
}

export interface ManifestModInfo{
    name?: string,
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
                csv_url: "https://raw.githubusercontent.com/BeatSaberCN/Loqolizer/refs/heads/master/localize.csv",
                key_prefix: "LOQOLIZER_", // your every key must starts with this key_prefix, or the key_prefix will be added before your key.
                // your csv file will be downloaded to this repo's csv_local file
                csv_local: "mods/Loqolizer.csv",
                // you don't need add crowdin_sync_file. This should be updated by crowdin maintainers. The file will be auto uploaded at next sync timing.
                crowdin_sync_file:"Loqolizer.csv",
            }
        ]
    },
    "HeartBeatLanReceiver" : {
        name: "HeartBeatQuest",
        datas: [
            {
                version:"*",
                csv_url: "https://raw.githubusercontent.com/frto027/HeartBeatQuest/refs/heads/ssl10n/assets/HeartBeatQuest.csv",
                key_prefix: "HEART_BEAT_QUEST_",
                csv_local: "mods/HeartBeatQuest.csv",
                crowdin_sync_file:"HeartBeatQuest.csv",
            }
        ]
    }
    /* add more mods here */
}
