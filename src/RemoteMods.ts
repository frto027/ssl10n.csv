import type { LocalizedModNames } from "./mods.js"

export interface RemoteModInfo{
    name:LocalizedModNames | string
    datas:Array<RemoteVersionSource>
}

export interface RemoteVersionSource{
    version:string,
    csv_url:string
}

export type RemoteManifestMods = Record<string /* mod id */, RemoteModInfo>