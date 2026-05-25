import pathlib
import json

mods = pathlib.Path("mods")

GAME_VERSIONS:list[str] = []
GAME_VERSIONS_REVERSE:list[str] = []

LANGUAGES = [
"English.json",
"French.json",
"Spanish.json",
"German.json",
"Italian.json",
"Portuguese_Brazil.json",
"Portuguese.json",
"Russian.json",
"Greek.json",
"Turkish.json",
"Danish.json",
"Norwegian.json",
"Swedish.json",
"Dutch.json",
"Polish.json",
"Finnish.json",
"Japanese.json",
"Simplified_Chinese.json",
"Traditional_Chinese.json",
"Korean.json",
"Czech.json",
"Hungarian.json",
"Romanian.json",
"Thai.json",
"Bulgarian.json",
"Hebrew.json",
"Arabic.json",
"Bosnian.json",
]

def to_csv_cell(val:str):
    do_escape = False
    if ',' in val:
        do_escape = True
    if "\r" in val:
        do_escape = True
    if "\n" in val:
        do_escape = True
    if do_escape:
        return '"' + val.replace('"', '""') + '"'
    return val

class ModTexts:
    def __init__(self):
        self.dict:dict[str,list[str]] = {}

    def add_json(self, path:pathlib.Path):
        if not path.name.endswith(".json"):
            return
        with path.open("r", encoding="utf8") as f:
            data = json.loads(f.read())
            if not path.name in LANGUAGES:
                print(f"Unknown language {path.name}, ignore it")
                return
            language_index = LANGUAGES.index(path.name)
            for k in data:
                assert isinstance(data[k], str), f"'{k}' in file {path} should be string"
                if not k in self.dict:
                    self.dict[k] = [""] * len(LANGUAGES)
                self.dict[k][language_index] = data[k]

    def to_csv(self, output_path:pathlib.Path):
        if len(x) == 0:
            return
        with output_path.open("w", encoding="utf-8-sig", newline="\r\n") as f:
            f.write("\npolyglot,100,\n")
            for k in self.dict:
                f.write(to_csv_cell(k) + ",")
                for v in self.dict[k]:
                    f.write("," + to_csv_cell(v))
                f.write("\n")

for game_version in mods.glob("*"):
    GAME_VERSIONS.append(game_version.name)
    GAME_VERSIONS_REVERSE.append(game_version.name)

GAME_VERSIONS.sort()
GAME_VERSIONS_REVERSE.sort(reverse=True)

# key "1.35.0/mod_id/English.json"
files:dict[str, dict[str, dict[str, pathlib.Path]]] = {}

def assign_file(ver:str, modid:str, lang:str, path:pathlib.Path):
    if not ver in files:
        files[ver] = {}
    if not modid in files[ver]:
        files[ver][modid] = {}
    files[ver][modid][lang] = path

# find every files, add to version/mod/lang list
for game_ver in GAME_VERSIONS:
    for modid in (mods/game_ver).glob("*"):
        for json_file in modid.glob("*"):
            assign_file(game_ver, modid.name, json_file.name, json_file)
            # also assign this file to the future game version
            for game_ver_append in GAME_VERSIONS_REVERSE:
                if game_ver_append == game_ver:
                    break
                assign_file(game_ver_append, modid.name, json_file.name, json_file)

# print the file database result
# for k1 in files:
#     for k2 in files[k1]:
#         for k3 in files[k1][k2]:
#             print(f"{k1}/{k2}/{k3}: {files[k1][k2][k3]}")

output = pathlib.Path("dist")
output.mkdir(exist_ok=True)

for game_version in files:
    output_game_version = output / game_version
    output_game_version.mkdir(exist_ok=True)
    version_mod = ModTexts()
    for modid in files[game_version]:
        manifest_ver:list[str] = []
        mod = ModTexts()
        for file in files[game_version][modid].values():
            mod.add_json(file)
            version_mod.add_json(file)
        mod.to_csv(output_game_version / f"{modid}.csv")
        manifest_ver.append(f"{game_version}/{modid}.csv")
    with (output_game_version / 'manifest.json').open("w") as f:
        f.write(json.dumps(manifest_ver))

    version_mod.to_csv(output / f"{game_version}.csv")

print(GAME_VERSIONS)
