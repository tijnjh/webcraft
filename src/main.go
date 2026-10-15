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

var craftApps = [...]string{
	"photocraft", "vectorcraft", "filmcraft", "lightcraft",
	"pdfcraft", "effectcraft", "designcraft", "figcraft",
	"wordcraft", "soundcraft", "deckcraft", "cadcraft",
	"gridcraft",
}

var verMap map[string]string = {}

var total = len(craftApps)
var done = 0
var startTime = time.Now()

func log(repo, msg string) {
	elapsed := fmt.Sprintf("%.1fs", time.Since(startTime).Seconds())
	fmt.Printf("[%s] [%d/%d] %s: %s\n", elapsed, done, total, repo, msg)
}

func main() {
	os.RemoveAll("./assets")
	os.Mkdir("./assets", 0750)
	lib.LoadEnv()
	fmt.Printf("Updating %d repos...\n", total)

	var wg sync.WaitGroup

	for _, repo := range craftApps {
		wg.Go(func() {
			log(repo, "fetching latest release")

			temp, _ := os.MkdirTemp("assets", ".extract-")

			defer os.RemoveAll(temp)
			target := "assets/" + repo

			release := lib.Fetch("https://api.github.com/repos/storytold/"+repo+"/releases/latest", {
				Method: "GET",
				Headers: {
					"Authorization": "Bearer " + os.Getenv("GITHUB_TOKEN"),
				},
			}).Json[struct {
				TagName string `json:"tag_name"`
				Assets  []struct {
					Name               string `json:"name"`
					BrowserDownloadUrl string `json:"browser_download_url"`
				} `json:"assets"`
			}]()

			verMap[repo] = release.TagName

			var assets []string

			for _, a := range release.Assets {
				if strings.Contains(a.Name, "-web-") {
					assets = append(assets, a.BrowserDownloadUrl)
				}
			}

			downloadUrl := assets[0]

			filePath := "assets/" + repo + ".zip"

			log(repo, fmt.Sprintf("downloading %s", release.TagName))

			fileStream, _ := os.Create(filePath)

			dlResp := lib.Fetch(downloadUrl, {Method: "GET"})

			io.Copy(fileStream, dlResp.Body)

			dlResp.Body.Close()

			fileStream.Close()

			log(repo, "extracting")

			lib.Unzip(filePath, temp)
			entries, _ := os.ReadDir(temp)

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
			log(repo, "done ("+release.TagName+")")
		})
	}

	wg.Wait()

	tmpl, _ := template.ParseFiles("./src/templates/index.html")

	var buf bytes.Buffer

	var repos lib.Arr[struct {
		Date    string
		Name    string
		Version string
	}] = {}

	for _, repo := range craftApps {
		repos.Push({
			Name:    strings.TrimSuffix(repo, "craft"),
			Date:    time.Now().Format("01/02/2006 03:04:05 PM"),
			Version: verMap[repo],
		})
	}

	tmpl.Execute(&buf, repos)
	os.WriteFile("./assets/index.html", buf.Bytes(), 0750)
}
