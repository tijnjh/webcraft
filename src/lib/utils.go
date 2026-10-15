package lib

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
)

func Unzip(src, dest string) {
	r, _ := zip.OpenReader(src)

	defer r.Close()

	for _, f := range r.File {
		path := filepath.Join(dest, f.Name)
		if f.FileInfo().IsDir() {
			os.MkdirAll(path, 0755)
			continue
		}
		os.MkdirAll(filepath.Dir(path), 0755)
		in, _ := f.Open()
		defer in.Close()

		out, _ := os.Create(path)
		io.Copy(out, in)
		out.Close()
	}
}
