import * as fs from "node:fs"
import { CrowdinOperates } from "./CrowdinOperates.js"
import { Buffer } from "node:buffer"
import { ModDatabase, WEB_ROOT, type ManifestModInfo, type ManifestVersionSource } from "./mods.js"
import type { RemoteManifestMods, RemoteModInfo } from "./RemoteMods.js"
import { CrowdinZipFile } from "./CrowdinZipFile.js"
import { stringify } from "csv-stringify/sync"
import { createHash } from "node:crypto"
import { parse } from "csv-parse/sync"

export class LocalMod {
    modId: string
    info: ManifestModInfo

    localVersions: Array<LocalVersionSource> = []

    changed = false
    constructor(modId: string, info: ManifestModInfo) {
        this.modId = modId
        this.info = info

        for (let v of info.datas) {
            this.localVersions.push(new LocalVersionSource(v))
        }
    }

    async syncLocal() {
        for (let l of this.localVersions) {
            try{
                await l.syncLocal()
                if(l.changed)
                    this.changed = true
            }catch(e){
                console.error("Can't handle mod " + this.modId + ":" + l.version)
                console.log(e)
            }
        }
    }

    async uploadCrowdin() {
        for (let l of this.localVersions) {
            try{
                await l.uploadCrowdin()
            }catch(e){
                console.error("Can't handle mod " + this.modId + ":" + l.version)
                console.log(e)
            }
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
        remote.mods[this.modId] = modInfo
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
    changed = false
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
            if(!fs.existsSync(this.version.csv_local)){
                this.changed = true
            }else{
                let old_bytes = fs.readFileSync(this.version.csv_local)
                if(!old_bytes.equals(bytes)){
                    this.changed = true
                }
            }
            
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

            const data = parse(csv_str)
            while(data.length > 0){
                if(data[0]!.length > 0){
                    const firstText = data[0]![0]
                    if(firstText == "polyglot" || firstText == "Polyglot" || firstText == "PolyMaster"){
                        data.shift()
                        break
                    }
                }
                data.shift()
            }
            for(let i=0;i<data.length;i++){
                if(data[i]!.length > 0){
                    const first = data[i]![0]!
                    if(first == ""){
                        continue
                    }
                    if(!first.startsWith(this.version.key_prefix)){
                        data[i]![0] = this.version.key_prefix + first
                    }
                }
            }
            csv_str = stringify(data,{
                            record_delimiter:"windows"
            })

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

        if(!fs.existsSync("web_root/mods/")){
            fs.mkdirSync("web_root/mods/", {recursive: true})
        }
        console.log("generating...")
        
        const column_count = 2 + CrowdinZipFile.crowdin_order.length

        const lines = []

        let line = new Array(column_count)
        line[0] = "Polyglot"
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
        const sync_file_name = `mods/${hash.substring(0,6)}.${this.version.crowdin_sync_file}`
        fs.writeFileSync(`web_root/${sync_file_name}`, csv_content)

        remote.datas.push({
            version: this.version.version,
            csv_url: `${WEB_ROOT}/${sync_file_name}`,
            csv_name: this.version.crowdin_sync_file,
            md5:hash
        })
    }
}
