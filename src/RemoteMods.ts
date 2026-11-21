export interface RemoteManifestMods {
    manifestTimestamp:string
    protobufSnapshotBinaryUrl:string,
    protobufSnapshotBinaryGzipUrl?:string,
    protobufSnapshotBinarySha256:string,
    protobufSnapshotJsonUrl?:string,
    modsHashesInProtobuf:string, /* the modsHashes inside the protobuf file */
    crowdinBuildId:string,
}
