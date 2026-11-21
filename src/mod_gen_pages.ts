import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { CrowdinOperates } from "./CrowdinOperates.js";
import { LocalMod, ModsHasher } from "./LocalMods.js";
import { CrowdinZipFile } from "./CrowdinZipFile.js";
import type { RemoteManifestMods } from "./RemoteMods.js";
import { WEB_ROOT } from "./mods.js";
import { create, toBinary, toJsonString } from "@bufbuild/protobuf";
import { SnapshotSchema } from "./protobuf/snapshot_pb.js";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
function sleep(ms:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


async function download_crowdin_zip(build_id:number){
    let c = await CrowdinOperates.getInstance()

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

async function generate_pages_from_zip(build_id:number){
    let crowninZip = new CrowdinZipFile()
    await crowninZip.init("dist/crowdin.zip")
    
    if(!existsSync("web_root"))
        mkdirSync("web_root")
    const mods = LocalMod.getMods()

    const buildTimestamp = new Date()
    const manifest: RemoteManifestMods = {
        crowdinBuildId: build_id.toString(),
        protobufSnapshotBinaryUrl: "",
        protobufSnapshotBinarySha256: "",
        modsHashesInProtobuf: "",
        manifestTimestamp: buildTimestamp.toISOString(),
    }

    const protobufSnapshot = create(SnapshotSchema, {
        timestamp : BigInt(buildTimestamp.getTime()) as bigint,
        mods: {}
    })

    const hasher = new ModsHasher();

    mods.sort((a,b)=>{
        if(a.modId > b.modId) return 1
        if(a.modId < b.modId) return -1
        return 0
    })

    if(crowninZip.baseGameFileContent){
        protobufSnapshot.baseGameCsvTranslation = crowninZip.baseGameFileContent
        hasher.updateBuffer(crowninZip.baseGameFileContent)
    }

    for(let mod of mods){
        await mod.handleCrowdinZip(crowninZip, protobufSnapshot, hasher)
    }
    protobufSnapshot.modsHashes = hasher.hash.digest("hex")
    manifest.modsHashesInProtobuf = protobufSnapshot.modsHashes

    const protobuffSnapshotBuffer = toBinary(SnapshotSchema, protobufSnapshot)
    const protoHasher = createHash("sha256")
    protoHasher.update(protobuffSnapshotBuffer)
    manifest.protobufSnapshotBinarySha256 = protoHasher.digest("hex")

    const file_location = manifest.protobufSnapshotBinarySha256.substring(0,6) + ".protobuf"
    manifest.protobufSnapshotBinaryUrl = WEB_ROOT + "/" + file_location
    writeFileSync("web_root/" + file_location, protobuffSnapshotBuffer)

    const gz_file_location = file_location + ".gz"
    writeFileSync("web_root/" + gz_file_location, gzipSync(protobuffSnapshotBuffer))
    manifest.protobufSnapshotBinaryGzipUrl = WEB_ROOT + "/" + gz_file_location

    const json_file_location = file_location + ".json"
    writeFileSync("web_root/" + json_file_location, toJsonString(SnapshotSchema, protobufSnapshot))
    manifest.protobufSnapshotJsonUrl = WEB_ROOT  + "/" + json_file_location
 
    writeFileSync("web_root/manifest.json", JSON.stringify(manifest))
}

async function gen_pages(){
    let force_update = process.env.FORCE_UPDATE
    // console.log("Running... force update is ", force_update)

    // if(existsSync(".forceUpdate")){
    //     force_update = 'true'
    // }
    // if(force_update != 'true'){
    //     let remote_manifest:RemoteManifestMods = (await (await fetch(WEB_ROOT + "/manifest.json")).json()) as any
    //     if(remote_manifest.crowdinUpdatedAt == (await CrowdinOperates.getInstance()).updatedAt){
    //         console.log("we don't need update.")
    //         if(process.env.GITHUB_OUTPUT){
    //             console.log("Write stop to github output.")
    //             writeFileSync(process.env.GITHUB_OUTPUT, "stop=true")
    //         }
    //         return
    //     }
    // }
    let c = await CrowdinOperates.getInstance()

    let build_id = (await c.corwdinClient.translationsApi.buildProject(c.projectId, {
            skipUntranslatedStrings: true,
            exportApprovedOnly: false
        })).data.id
    console.log("latest build id = ", build_id);
    // Always materialize snapshot files: a clean CI checkout does not contain
    // the published data, and frontend-only changes still need a complete site.
    

    await download_crowdin_zip(build_id)
    await generate_pages_from_zip(build_id)

    if(process.env.GITHUB_OUTPUT){
        console.log("Write stop to github output.")
        writeFileSync(process.env.GITHUB_OUTPUT, "stop=false")
    }
}

gen_pages()
