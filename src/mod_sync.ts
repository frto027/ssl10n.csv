import { LocalMod } from "./LocalMods.js";

for(let mod of LocalMod.getMods()){
    mod.syncLocal()
}