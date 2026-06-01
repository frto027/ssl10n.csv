import { LocalMod } from "./LocalMods.js";

async function upload() {
    for(let mod of LocalMod.getMods()){
        await mod.uploadCrowdin()
    }
}
upload()

