package lib

type Arr[T any] []T

func (a *Arr[T]) Push(newItem T) {
	*a = append(*a, newItem)
}
