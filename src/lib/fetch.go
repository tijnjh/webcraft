package lib

import (
	"encoding/json"
	"io"
	"net/http"
)

type FetchResponse struct{ http.Response }

func (r *FetchResponse) Json[T any]() *T {
	body, _ := io.ReadAll(r.Body)
	r.Body.Close()
	var output T
	json.Unmarshal(body, &output)
	return &output
}

func Fetch(
	input string,
	init struct {
		Method  string
		Headers map[string]string
	},
) *FetchResponse {
	request, _ := http.NewRequest(init.Method, input, nil)
	for key, value := range init.Headers {
		request.Header.Set(key, value)
	}
	resp, _ := http.DefaultClient.Do(request)
	return {*resp}
}
