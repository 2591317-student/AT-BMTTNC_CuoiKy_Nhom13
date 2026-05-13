// NOTE: Keys are exposed here intentionally for the demo.
// In production these must NEVER appear in frontend code.

export const DEVICES = [
  {
    deviceId:   'sensor-001',
    apiKey:     '89583233bea43a5afd7503633c85701baeb35f3bc972f544',
    hmacSecret: '287de596d905876b0d6f05721ce3ab11543d6f4d93d6191ad1ac254ac69f8916',
  },
  {
    deviceId:   'sensor-002',
    apiKey:     'dda41825ddba9fc8000bfe14993d3e17841b3a4be052d1c3',
    hmacSecret: '6c4c65992d06dae20bac47c1a4918cf787d888346693fab5d5a9a59abdf5298f',
  },
  {
    deviceId:   'sensor-003',
    apiKey:     'c0519057dc8828a0d542afbd94d9d5c392b4282195ce8571',
    hmacSecret: 'e79e280326c4a920bcdbc2d4546e4cd3f0e057c4a2bcd9962c5954c3ac782e44',
  },
]

// Default device for manual demo buttons
export const DEFAULT_DEVICE = DEVICES[0]

export const REFRESH_MS = 3000
