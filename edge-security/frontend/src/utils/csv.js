function download(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportRecordsCsv(records) {
  const header = 'id,deviceId,temperature,timestamp,isValidSignature,encryptedTemp'
  const rows   = records.map(r =>
    [r.id, r.deviceId, r.temperature ?? '', r.timestamp,
     r.isValidSignature ? 1 : 0, `"${r.encryptedTemp ?? ''}"`].join(',')
  )
  download(`records_${Date.now()}.csv`, [header, ...rows].join('\n'))
}

export function exportAuditCsv(log) {
  const header = 'time,code,layer,device,reason'
  const rows   = log.map(e =>
    [e.time, e.code, e.layer, e.device, `"${e.reason}"`].join(',')
  )
  download(`audit_${Date.now()}.csv`, [header, ...rows].join('\n'))
}
