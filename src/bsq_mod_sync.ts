// download mod data from bsq_mods and generate a metadata csv file for every mods

import { stringify } from "csv-stringify/sync"
import { writeFileSync } from "node:fs"

interface ModInfo{
    name:string,
    desc:string,
}

export async function bsq_mod_sync(){
    let mods = await (await fetch("https://mods.bsquest.xyz/mods.json")).json()

    let infos = new Map<string, ModInfo>()

    let csv_file = [["Polyglot","",""]]

    for(const version in mods){
        for(const mod of mods[version]){
            let name = mod.name
            if(name == undefined || name == null || name == "")
                name = mod.id
            const id = mod.id
            let desc = mod.description
            if(desc == undefined || desc == null)
                desc = ""
            infos.set(id, {
                name,desc
            })
        }
    }

    for(let info of infos){
        csv_file.push(["MOD_META_" + info[0] + "_NAME","",info[1].name])
        csv_file.push(["MOD_META_" + info[0] + "_DESC","",info[1].desc])
    }

    writeFileSync("mods/ModMetaData.csv", stringify(csv_file, {
        record_delimiter:"windows"
    }));
}

bsq_mod_sync()