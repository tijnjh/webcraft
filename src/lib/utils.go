package lib

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

func Unzip(src, dest string) error {
	r := Unwrap(zip.OpenReader(src))

	defer r.Close()

	for _, f := range r.File {
		if !filepath.IsLocal(f.Name) {
			panic(fmt.Sprintf("unsafe path: %s", f.Name))
		}

		path := filepath.Join(dest, f.Name)
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(path, 0755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		in := Unwrap(f.Open())

		defer in.Close()
		out := Unwrap(os.Create(path))
		Unwrap(io.Copy(out, in))
		out.Close()
	}

	return nil
}

func Unwrap[t any](value t, err error) t {
	if err != nil {
		panic(err)
	}
	return value
}
