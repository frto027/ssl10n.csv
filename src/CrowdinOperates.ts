// credentials

import { Client, type Credentials, SourceFilesModel } from '@crowdin/crowdin-api-client';
import { existsSync, readFileSync } from 'node:fs';

let project_name = "beatsaber-sslocalization"

export class CrowdinOperates{
    static instance?:CrowdinOperates

    static async getInstance():Promise<CrowdinOperates>{
        if(!this.instance){
            this.instance = new CrowdinOperates()
            await this.instance.init()
        }
        return this.instance
    }

    corwdinClient:Client
    projectId:number = -1
    dirId = -1
    updatedAt:string = ""
    constructor(){
        const credentials: Credentials = {
            token: process.env.CROWDIN_TOKEN || "",
        };

        if(existsSync(".crowdin_token")){
            credentials.token = readFileSync(".crowdin_token").toString()
        }

        if(credentials.token == ""){
            throw new Error("No crowdin token.")
        }

        this.corwdinClient = new Client(credentials)
    }

    async init(){
        for(let proj of (await this.corwdinClient.projectsGroupsApi.listProjects()).data){
            if(proj.data.name == project_name){
                this.projectId = proj.data.id
                this.updatedAt = proj.data.updatedAt
            }
        }
        if(this.projectId == -1){
            throw new Error("Project id not found")
        }

        for(let dir of (await this.corwdinClient.sourceFilesApi.listProjectDirectories(this.projectId)).data){
            if(dir.data.name == 'mods'){
                this.dirId = dir.data.id
            }
        }
        if(this.dirId == -1){
            throw new Error("You need a crowdin directory called 'mods'")
        }
    }
}
