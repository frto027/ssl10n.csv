# How to setup a crowdin project

If you want make this repo works for your own crowdin project.

- create a crowdin project.
- update project name in "src\CrowdinOperates.ts", you also need create a folder called `qmods` in your crowdin project.
- configure some languages for your crowdin.
- get your crowdin token from their website
- setup a file called `.crowdin_token` for local test.
- setup a github secret `CROWDIN_TOKEN`
- it's done. there are several npm scripts and github actions for sync mod/crowdin things.
