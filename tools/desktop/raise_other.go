//go:build !windows

package main

import "time"

// holdOnTop has no focus-safe way to raise a window off Windows, so there the toast alone announces what arrived.
func (s *shell) holdOnTop(time.Duration) {}
