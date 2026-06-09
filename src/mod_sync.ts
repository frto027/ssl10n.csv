import { bsq_mod_sync } from "./bsq_mod_sync.js";
import { LocalMod } from "./LocalMods.js";

async function do_action(){
    await bsq_mod_sync();
    for(let mod of LocalMod.getMods()){
        await mod.syncLocal();
    }
}

do_action()

