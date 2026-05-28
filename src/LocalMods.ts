import * as fs from "node:fs"
import { CrowdinOperates } from "./CrowdinOperates.js"
import { Buffer } from "node:buffer"
import { ModDatabase, WEB_ROOT, type ManifestModInfo, type ManifestVersionSource } from "./mods.js"
import type { RemoteManifestMods, RemoteModInfo } from "./RemoteMods.js"
import { CrowdinZipFile } from "./CrowdinZipFile.js"
import { stringify } from "csv-stringify/sync"
import { createHash } from "node:crypto"

export class LocalMod {
    modId: string
    info: ManifestModInfo

    localVersions: Array<LocalVersionSource> = []
    constructor(modId: string, info: ManifestModInfo) {
        this.modId = modId
        this.info = info

        for (let v of info.datas) {
            this.localVersions.push(new LocalVersionSource(v))
        }
    }

    async syncLocal() {
        for (let l of this.localVersions) {
            await l.syncLocal()
        }
    }

    async uploadCrowdin() {
        for (let l of this.localVersions) {
            await l.uploadCrowdin()
        }
    }

    async handleCrowdinZip(zip:CrowdinZipFile, remote:RemoteManifestMods) {
        const modInfo:RemoteModInfo = {
            name: this.info.name || this.modId,
            datas: []
        }
        for (let l of this.localVersions) {
            await l.handleCrowdinZip(zip, modInfo)
        }
        remote[this.modId] = modInfo
    }

    saveRemote(): RemoteManifestMods {
        throw new Error("No impl.")
    }

    static getMods(){
        let ret = []
        for(let mod in ModDatabase){
            ret.push(new LocalMod(mod, ModDatabase[mod]!))
        }
        return ret
    }
}

class LocalVersionSource {
    version: ManifestVersionSource
    constructor(version: ManifestVersionSource) {
        this.version = version
    }

    async syncLocal() {
        console.log(`sync for ${this.version.csv_url}`)
        if(this.version.disable_csv_downlad){
            console.log("ignore")
            return
        }
        try {
            let bytes = await (await fetch(this.version.csv_url)).bytes();
            fs.writeFileSync(this.version.csv_local, bytes)
            console.log(`done, ${bytes.length} bytes downloaded`)
        } catch (e) {
            console.error(`sync crowdin failed with ${this.version.csv_url}`, e)
        }
    }
    async uploadCrowdin() {
        if (!this.version.crowdin_sync_file) {
            console.log(`ignore ${this.version.csv_local} because crowdin not setup`)
            return
        }
        try {
            let csv_bytes = fs.readFileSync(this.version.csv_local)

            if(csv_bytes.length > 3 && csv_bytes[0] == 0xef && csv_bytes[1] == 0xbb && csv_bytes[2] == 0xbf){
                csv_bytes = csv_bytes.subarray(3)
            }
            let csv_str = csv_bytes.toString("utf-8")
            let csv_lines = csv_str.split("\n")

            while(csv_lines.length > 0){
                const line = csv_lines[0]
                if(line?.startsWith("polyglot,") || line?.startsWith("Polyglot,") || line?.startsWith("PolyMaster,")){
                    csv_lines.shift()
                    break
                }
                csv_lines.shift()
            }
            for(let i=0;i<csv_lines.length;i++){
                if(csv_lines[i]!.indexOf(",") <0)
                    continue
                if(csv_lines[i]!.startsWith('"')){
                    if(!csv_lines[i]!.startsWith('"'+this.version.key_prefix)){
                        csv_lines[i] = '"' + this.version.key_prefix + csv_lines[i]?.substring(1)
                    }
                }else{
                    if(!csv_lines[i]!.startsWith(this.version.key_prefix)){
                        csv_lines[i] = this.version.key_prefix + csv_lines[i]
                    }
                }

            }
            csv_str = csv_lines.join("\n")

            let c = await CrowdinOperates.getInstance()
            let files = await c.corwdinClient.sourceFilesApi.listProjectFiles(c.projectId, {
                directoryId: c.dirId,
                limit: 400
            })
            let file_id : number = -1
            console.log("will sync crowdin file " + this.version.crowdin_sync_file)
            for(let f of files.data){
                if(f.data.name == this.version.crowdin_sync_file){
                    file_id = f.data.id
                    console.log("file found.")
                }
            }

            if(file_id != -1){
                // check the remote file update
                let downlaod_data = await c.corwdinClient.sourceFilesApi.downloadFile(c.projectId, file_id)
                let bytes = await (await fetch(downlaod_data.data.url)).bytes()
                let file_str = Buffer.from(bytes).toString("utf-8")

                if(file_str == csv_str)
                {
                    console.log("file match, no need update")
                    return       
                }
            }

            let storage = await c.corwdinClient.uploadStorageApi.addStorage(this.version.crowdin_sync_file, csv_str)

            if(file_id == -1){
                console.log("will create...")
                await c.corwdinClient.sourceFilesApi.createFile(c.projectId, {
                    storageId: storage.data.id,
                    name: this.version.crowdin_sync_file,
                    directoryId: c.dirId,
                    importOptions:{
                        scheme:{
                            identifier: 0,
                            context: 1,
                            sourceOrTranslation: 2,
                        } as any
                    }
                })
            }else{
                console.log("will update...")
                await c.corwdinClient.sourceFilesApi.updateOrRestoreFile(c.projectId, file_id, {
                    storageId: storage.data.id,
                    name: this.version.crowdin_sync_file,
                    updateOption: "clear_translations_and_approvals"
                } )
            }
            console.log("done")
        }catch(e){
            // console.error(`error while handling ${this.version.csv_local}`, e)
            throw e
        }
    }

    async handleCrowdinZip(zip:CrowdinZipFile, remote:RemoteModInfo) {
        console.log("handle crowdin file for local csv file" + this.version.csv_local)
        if(this.version.crowdin_sync_file == undefined){
            console.log("no csv file.")
            return
        }
        console.log("remote crowdin file is " + this.version.crowdin_sync_file)
        let data = zip.datas.get(this.version.crowdin_sync_file)
        if(data == undefined){
            console.log("no remote file found")
            return
        }

        if(!fs.existsSync("dist_page/mods/")){
            fs.mkdirSync("dist_page/mods/", {recursive: true})
        }
        console.log("generating...")
        
        const column_count = 2 + CrowdinZipFile.crowdin_order.length

        const lines = []

        let line = new Array(column_count)
        line[0] = "polyglot"
        line[1] = "100"
        for(let i=2; i< line.length;i++){
            line[i] = ""
        }
        lines.push(line)
        for(const keyValues of data){
            line = new Array(column_count)
            line[0] = keyValues[0]
            line[1] = ""

            let enText = keyValues[1].get("en")
            let isUsefulLine = false
            let currentColumn = 2
            for(const lineCode of CrowdinZipFile.crowdin_order){
                let value = keyValues[1].get(lineCode) || ""
                if(value == "" || value == enText)
                    value = ""
                if(value != "")
                    isUsefulLine = true
                line[currentColumn++] = value
            }
            if(isUsefulLine){
                lines.push(line)
            }
        }

        if(lines.length == 1){
            console.log("no useful line, file not generated.")
            return
        }
        const csv_content = stringify(lines,{
            record_delimiter:"windows"
        })
        console.log("done")
        const hash = createHash("md5").update(csv_content).digest("hex")
        fs.writeFileSync(`dist_page/mods/${hash}.${this.version.crowdin_sync_file}`, csv_content)

        remote.datas.push({
            version: this.version.version,
            csv_url: `${WEB_ROOT}/mods/${hash}.${this.version.crowdin_sync_file}`,
            csv_name: this.version.crowdin_sync_file,
            md5:hash
        })
    }
}
