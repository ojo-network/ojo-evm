package relayer

import (
	"testing"
	"time"
)

func TestHeartbeat(t *testing.T) {
	tests := []struct {
		name       string
		interval   time.Duration
		lastUpdate time.Time
		want       bool
	}{
		{
			name:       "Time since last update is less than interval",
			interval:   5 * time.Second,
			lastUpdate: time.Now().Add(-3 * time.Second),
			want:       false,
		},
		{
			name:       "Time since last update is equal to interval",
			interval:   5 * time.Second,
			lastUpdate: time.Now().Add(-5 * time.Second),
			want:       true,
		},
		{
			name:       "Time since last update is greater than interval",
			interval:   5 * time.Second,
			lastUpdate: time.Now().Add(-7 * time.Second),
			want:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := heartbeat(tt.interval, tt.lastUpdate); got != tt.want {
				t.Errorf("heartbeat() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDeviated(t *testing.T) {
	tests := []struct {
		name      string
		price     float64
		newPrice  float64
		threshold float64
		wantDev   float64
		wantBool  bool
	}{
		{
			name:      "No deviation",
			price:     100.0,
			newPrice:  100.0,
			threshold: 10.0,
			wantDev:   0.0,
			wantBool:  false,
		},
		{
			name:      "Deviation less than threshold",
			price:     100.0,
			newPrice:  105.0,
			threshold: 0.10,
			wantDev:   0.05,
			wantBool:  false,
		},
		{
			name:      "Deviation equal to threshold",
			price:     100.0,
			newPrice:  110.0,
			threshold: 0.10,
			wantDev:   0.10,
			wantBool:  true,
		},
		{
			name:      "Deviation greater than threshold",
			price:     100.0,
			newPrice:  115.0,
			threshold: 0.10,
			wantDev:   0.15,
			wantBool:  true,
		},
		{
			name:      "Existing price larger than new price",
			price:     100.0,
			newPrice:  85.0,
			threshold: 0.10,
			wantDev:   0.15,
			wantBool:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotDev, gotBool := deviated(tt.price, tt.newPrice, tt.threshold)
			if gotDev != tt.wantDev {
				t.Errorf("deviated() gotDev = %v, want %v", gotDev, tt.wantDev)
			}
			if gotBool != tt.wantBool {
				t.Errorf("deviated() gotBool = %v, want %v", gotBool, tt.wantBool)
			}
		})
	}
}
