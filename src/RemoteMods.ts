import type { LocalizedModNames } from "./mods.js"

export interface RemoteModInfo{
    name:LocalizedModNames | string
    datas:Array<RemoteVersionSource>
}

export interface RemoteVersionSource{
    version:string,
    csv_url:string,
    csv_name:string,
    md5:string
}

export interface RemoteManifestMods {
    mods: Record<string /* mod id */, RemoteModInfo>,
    crowdinUpdatedAt:string,
    manifestTimestamp:string
}
