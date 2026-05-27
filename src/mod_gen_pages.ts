import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { CrowdinOperates } from "./CrowdinOperates.js";
import { LocalMod } from "./LocalMods.js";
import { CrowdinZipFile } from "./CrowdinZipFile.js";
import type { RemoteManifestMods } from "./RemoteMods.js";

function sleep(ms:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


async function download_crowdin_zip(){
    let c = await CrowdinOperates.getInstance()

    let build_id = -1
    for(let build of (await c.corwdinClient.translationsApi.listProjectBuilds(c.projectId)).data){
        if(new Date().getTime() - new Date(build.data.finishedAt).getTime() < 6 /* hours */ * 60 * 60 * 1000){
            build_id = build.data.id
            console.log("recent build found, use this. the build finishit at: " + build.data.finishedAt )
            break
        }
    }


    if(build_id == -1){
        console.log("recent build id not found, will build first.")
        build_id = (await c.corwdinClient.translationsApi.buildProject(c.projectId, {
            skipUntranslatedStrings: true,
            exportApprovedOnly: false
        })).data.id
        console.log("build started")
    }

    let build_status = (await c.corwdinClient.translationsApi.checkBuildStatus(c.projectId, build_id)).data.status
    if(build_status == "inProgress"){
        console.log(`build ${build_id} is inProgress, waiting...`)
        for(let sec = 0; sec < 5 * 60 /* 5 minutes */; sec += 5){
            await sleep(5000) /* 5 sec */
            build_status = (await c.corwdinClient.translationsApi.checkBuildStatus(c.projectId, build_id)).data.status
            if(build_status == "inProgress"){
                if(sec % 20 == 0){
                    console.log(`still waiting... ${sec} seconds`)
                }
            }else{
                break
            }
        }
    }

    if(build_status != "finished"){
        throw new Error(`Invalid build status for build id ${build_id}(${build_status})`)
    }

    let build = await c.corwdinClient.translationsApi.downloadTranslations(c.projectId, build_id)

    console.log("downloading...")
    let result = await (await fetch(build.data.url)).bytes()
    console.log("save to dist/crowdin.zip")
    writeFileSync("dist/crowdin.zip", result)
    console.log("file saved")
}

async function generate_pages_from_zip(){
    let crowninZip = new CrowdinZipFile()
    await crowninZip.init("dist/crowdin.zip")
    
    if(!existsSync("dist_page"))
        mkdirSync("dist_page")
    const mods = LocalMod.getMods()

    const manifest: RemoteManifestMods = {

    }
    for(let mod of mods){
        await mod.handleCrowdinZip(crowninZip, manifest)
    }
    writeFileSync("dist_page/manifest.json", JSON.stringify(manifest))
}

async function gen_pages(){
    await download_crowdin_zip()
    await generate_pages_from_zip()
}

gen_pages()