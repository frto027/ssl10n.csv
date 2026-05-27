import { LocalMod } from "./LocalMods.js";

for(let mod of LocalMod.getMods()){
    mod.saveRemote()
}

throw new Error("No impl.")