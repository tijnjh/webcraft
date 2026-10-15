package main

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
	"os"
	"strings"
	"sync"
	"time"
	"webcraft/lib"
)

var reposToCheck []string = {
	"photo",
	"vector",
	"film",
	"light",
	"pdf",
	"effect",
	"design",
	"fig",
	"word",
	"sound",
	"deck",
	"cad",
	"grid",
}

var verMap map[string]string = {}

var total = len(reposToCheck)
var done = 0
var startTime = time.Now()

func log(repo, msg string) {
	elapsed := fmt.Sprintf("%.1fs", time.Since(startTime).Seconds())
	fmt.Printf("[%s] [%d/%d] %s: %s\n", elapsed, done, total, repo, msg)
}

func main() {

	os.RemoveAll("./assets")
	os.Mkdir("./assets", 0750)

	if err :=
		lib.LoadEnv(); err != nil {
		panic(err)
	}

	fmt.Printf("Updating %d repos...\n", total)

	var wg sync.WaitGroup

	for _, r := range reposToCheck {
		wg.Go(func() {
			repo := r + "craft"

			log(repo, "fetching latest release")
			temp := lib.Unwrap(os.MkdirTemp("assets", ".extract-"))
			defer os.RemoveAll(temp)
			target := "assets/" + repo

			res := lib.Unwrap(lib.Fetch("https://api.github.com/repos/storytold/"+repo+"/releases/latest", {
				Method: "GET",
				Headers: {
					"Authorization": "Bearer " + os.Getenv("GITHUB_TOKEN"),
				},
			}))

			release := lib.Unwrap(res.Json[struct {
				TagName string `json:"tag_name"`
				Assets  []struct {
					Name               string `json:"name"`
					BrowserDownloadUrl string `json:"browser_download_url"`
				} `json:"assets"`
			}]())

			ver := release.TagName
			verMap[repo] = ver

			var assets []string

			for _, a := range release.Assets {
				if strings.Contains(a.Name, "-web-") {
					assets = append(assets, a.BrowserDownloadUrl)
				}
			}

			var downloadUrl string

			if len(assets) == 0 {
				log(repo, fmt.Sprintf("no web asset found in release %s", ver))
				panic(0)
			} else {
				downloadUrl = assets[0]
			}

			filePath := "assets/" + repo + ".zip"

			log(repo, fmt.Sprintf("downloading %s", ver))

			fileStream := lib.Unwrap(os.Create(filePath))

			dlResp := lib.Unwrap(lib.Fetch(downloadUrl, {Method: "GET"}))

			lib.Unwrap(io.Copy(fileStream, dlResp.Body))
			dlResp.Body.Close()
			fileStream.Close()

			log(repo, "extracting")

			if err := lib.Unzip(filePath, temp); err != nil {
				panic(err)
			}

			entries := lib.Unwrap(os.ReadDir(temp))
			root := entries[0]

			var source string

			if len(entries) == 1 && root.IsDir() {
				source = temp + "/" + root.Name()
			} else {
				source = temp
			}

			os.RemoveAll(target)
			os.Rename(source, target)
			os.Remove(filePath)

			done++
			log(repo, fmt.Sprintf("done (%s)", ver))
		})
	}

	wg.Wait()

	tmpl, err := template.ParseFiles("./src/templates/index.html")

	if err != nil {
		panic(err)
	}

	var buf bytes.Buffer

	var repos lib.Arr[struct {
		Date    string
		Name    string
		Version string
	}] = {}

	for _, repo := range reposToCheck {
		repos.Push({
			Name:    repo,
			Date:    time.Now().Format("01/02/2006 03:04:05 PM"),
			Version: verMap[repo+"craft"],
		})
	}

	if err :=
		tmpl.Execute(&buf, repos); err != nil {
		panic(err)
	}

	if err :=
		os.WriteFile("./assets/index.html", buf.Bytes(), 0750); err != nil {
		panic(err)
	}
}
