package lib

import (
	"encoding/json"
	"io"
	"net/http"
)

type FetchResponse struct {
	http.Response
}

func (r FetchResponse) Json[T any]() (*T, error) {
	body, err := io.ReadAll(r.Body)

	if err != nil {
		return nil, err
	}
	r.Body.Close()

	var output T

	if err := json.Unmarshal(body, &output); err != nil {
		panic(err)
	}

	return &output, nil
}

func Fetch(path string, opts struct {
	Method  string
	Headers map[string]string
}) (*FetchResponse, error) {
	req, err := http.NewRequest(opts.Method, path, nil)

	if err != nil {
		return nil, err
	}

	for key, value := range opts.Headers {
		req.Header.Set(key, value)
	}

	res, err := http.DefaultClient.Do(req)

	if err != nil {
		return nil, err
	}

	return &FetchResponse{Response: *res}, nil
}
