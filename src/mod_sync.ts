import { bsq_mod_sync } from "./bsq_mod_sync.js";
import { LocalMod } from "./LocalMods.js";
import * as fs from "node:fs"
async function do_action(){
    await bsq_mod_sync();

    let changed_mods = []

    for(let mod of LocalMod.getMods()){
        await mod.syncLocal();
        if(mod.changed){
            changed_mods.push(mod.modId)
        }
    }

    if(process.env.GITHUB_OUTPUT){
        let mod_titles = ""
        if(changed_mods.length > 0){
            mod_titles = "(" + changed_mods.join(",") + ")"   
        }
        mod_titles.replaceAll('"',"")
        fs.writeFileSync(process.env.GITHUB_OUTPUT, 'mods="'+mod_titles + '"')
    }
}

do_action()

