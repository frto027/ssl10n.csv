// download mod data from bsq_mods and generate a metadata csv file for every mods

import { stringify } from "csv-stringify/sync"
import { readFileSync, writeFileSync } from "node:fs"
import * as semver from "semver"

interface ModInfo{
    name:string,
    desc:string,
    latest_seen_game_ver:string
}

export async function bsq_mod_sync():Promise<boolean /* true means updated */>{
    let mods = await (await fetch("https://mods.bsquest.xyz/mods.json")).json()

    let version_re = new RegExp("^\\d+\\.\\d+\\.\\d+")
    let infos = new Map<string, ModInfo>()

    // we add a phantom mod called ModMetadata, so this fake mod id also can be localized.
    infos.set("ModMetadata",{
        name: "Mod Metadata",
        desc: "The medatada information of mod name/descriptions.",
        latest_seen_game_ver: "N/A"
    })

    let csv_file = [["Polyglot","",""]]
    console.log("start bsq sync")
    for(const version in mods){
        let ver_match = version_re.exec(version)
        if(!ver_match)
        {
            console.log("version not match", version);
            continue
        }
        if(semver.lt(ver_match[0], "1.40.8")){
            continue
        }
        for(const mod of mods[version]){
            let name = mod.name
            if(name == undefined || name == null || name == "")
                name = mod.id
            const id = mod.id
            let desc = mod.description
            if(desc == undefined || desc == null)
                desc = ""
            infos.set(id, {
                name,desc,
                latest_seen_game_ver: ver_match[0]
            })
        }
    }


    for(let info of infos){
        csv_file.push(["QMOD_META_" + info[0] + "_NAME",`mod name of ${info[0]} (${info[1].latest_seen_game_ver})`,info[1].name])
        csv_file.push(["QMOD_META_" + info[0] + "_DESC",`mod description of ${info[0]} (${info[1].latest_seen_game_ver})`,info[1].desc])
        csv_file.push(["QMOD_META_" + info[0] + "_TRANSLATOR",`mod translators of ${info[0]} (${info[1].latest_seen_game_ver}), add your name here if you translate this mod.`,""])
    }

    let output = Buffer.from(stringify(csv_file, {
        record_delimiter:"windows"
    }), "utf-8")

    let ret = readFileSync("mods/ModMetadata.csv").equals(output) == false

    writeFileSync("mods/ModMetadata.csv", output);

    return ret
}
