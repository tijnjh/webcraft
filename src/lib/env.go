package lib

import (
	"bufio"
	"os"
	"strings"
)

func LoadEnv() {
	file, _ := os.Open("./.env")
	defer file.Close()

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		os.Setenv(key, value)
	}
	if err := scanner.Err(); err != nil {
		panic(err)
	}
}
