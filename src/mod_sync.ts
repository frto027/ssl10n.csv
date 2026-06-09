import { bsq_mod_sync } from "./bsq_mod_sync.js";
import { LocalMod } from "./LocalMods.js";

bsq_mod_sync()
for(let mod of LocalMod.getMods()){
    mod.syncLocal()
}