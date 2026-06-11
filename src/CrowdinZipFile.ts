import { parse } from "csv-parse/sync";
import StreamZip from "node-stream-zip";

export class CrowdinZipFile{
    /* modName, keyCode, langCode, translate */
    datas:Map<string, Map<string, Map<string, string>> > = new Map()

    constructor(){
        
    }
    async init(path:string){
        const zip = new StreamZip.async({file: path})

        const entries = await zip.entries()

        const re = new RegExp("^([a-zA-Z0-9-]+)/qmods/([^/]+\\.csv)$")

        for(const fileName in entries){
            const entry = entries[fileName]!
            if(!entry.isFile)
                continue
            const m = re.exec(fileName)
            if(!m){
                console.log(`can't handle ${fileName}, ignore it`)
                continue
            }
            const langCode = m[1]
            const modFileName = m[2]
            // console.log(`handling ${modFileName} for language ${langCode}...`)

            const data = await zip.entryData(entry)
            const records = parse(data, {})

            let modMap = this.datas.get(modFileName!)
            if(modMap == undefined){
                this.datas.set(modFileName!, new Map())
                modMap = this.datas.get(modFileName!)!
            }

            for(let rec of records){
                if(rec.length < 3){
                    continue
                }
                let keyMap = modMap.get(rec[0]!)
                if(keyMap == undefined){
                    modMap.set(rec[0]!, new Map())
                    keyMap = modMap.get(rec[0]!)!
                }

                keyMap.set(langCode!, rec[2]!)
            }
        }
        await zip.close()
    }
    static crowdin_order = [
        "en",
        "fr",
        "es-ES",
        "de",
        "it",
        "pt-BR",
        "pt-PT",
        "ru",
        "el",
        "tr",
        "da",
        "no",
        "sv-SE",
        "nl",
        "pl",
        "fi",
        "ja",
        "zh-CN",
        "zh-TW",
        "ko",
        "cs",
        "hu",
        "ro",
        "th",
        "bg",
        "he",
        "ar",
        "bs",
    ]
}

