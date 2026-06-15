import { Activity, AlertTriangle, Cpu, Layers, Monitor, TerminalSquare, Trash2 } from 'lucide-react'

import type { MemorySample } from '../../stores/uiStore'
import { useUiStore } from '../../stores/uiStore'
import { Modal } from './Modal'
import controls from './controls.module.css'
import styles from './MemoryAnalyticsModal.module.css'

type Bucket = 'app_mb' | 'webview_mb' | 'ptys_mb'

const BUCKETS: Array<{ key: Bucket; label: string; short: string }> = [
  { key: 'app_mb', label: 'App', short: 'App' },
  { key: 'webview_mb', label: 'WebView', short: 'Web' },
  { key: 'ptys_mb', label: 'Terminais', short: 'PTY' },
]

function formatMb(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return `${value.toFixed(value >= 100 ? 0 : 1)} MB`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function average(samples: MemorySample[], key: keyof Pick<MemorySample, 'total_mb' | Bucket>): number {
  if (samples.length === 0) return 0
  return samples.reduce((sum, sample) => sum + Number(sample[key]), 0) / samples.length
}

function getGrowth(samples: MemorySample[], key: keyof Pick<MemorySample, 'total_mb' | Bucket>): number {
  if (samples.length < 2) return 0
  return Number(samples[samples.length - 1][key]) - Number(samples[0][key])
}

function dominantBucket(sample: MemorySample | null): { label: string; value: number; share: number } | null {
  if (!sample || sample.total_mb <= 0) return null
  const top = BUCKETS.map((bucket) => ({
    label: bucket.label,
    value: sample[bucket.key],
    share: sample[bucket.key] / sample.total_mb,
  })).sort((a, b) => b.value - a.value)[0]
  return top ?? null
}

function buildDiagnostics(history: MemorySample[]): string[] {
  if (history.length === 0) return ['Sem dados suficientes ainda.']

  const latest = history[history.length - 1]
  const recent = history.filter((sample) => latest.ts - sample.ts <= 10 * 60_000)
  const windowed = recent.length >= 2 ? recent : history
  const totalGrowth = getGrowth(windowed, 'total_mb')
  const bucketGrowth = BUCKETS.map((bucket) => ({
    label: bucket.label,
    value: getGrowth(windowed, bucket.key),
  })).sort((a, b) => b.value - a.value)[0]
  const top = dominantBucket(latest)
  const diagnostics: string[] = []

  if (latest.total_mb >= 2048) {
    diagnostics.push('Uso total acima de 2 GB. Vale suspender grupos ociosos ou reiniciar panes antigos.')
  } else if (latest.total_mb >= 1024) {
    diagnostics.push('Uso total acima de 1 GB. Acompanhe crescimento antes de abrir mais terminais.')
  }

  if (totalGrowth >= 250) {
    diagnostics.push(`Crescimento de ${formatMb(totalGrowth)} na janela recente. Possível vazamento ou processo acumulando cache.`)
  } else if (totalGrowth >= 120) {
    diagnostics.push(`Crescimento moderado de ${formatMb(totalGrowth)} na janela recente.`)
  }

  if (bucketGrowth && bucketGrowth.value >= 80) {
    diagnostics.push(`${bucketGrowth.label} foi a categoria que mais cresceu: +${formatMb(bucketGrowth.value)}.`)
  }

  if (top && top.share >= 0.6) {
    diagnostics.push(`${top.label} concentra ${(top.share * 100).toFixed(0)}% da memória atual.`)
  }

  if (latest.process_count >= 20) {
    diagnostics.push(`${latest.process_count} processos no subtree do app. Muitos shells/CLIs abertos podem ser o gargalo.`)
  }

  if (diagnostics.length === 0) {
    diagnostics.push('Sem gargalo claro no histórico atual. O consumo está estável ou distribuído.')
  }

  return diagnostics
}

function Sparkline({ samples }: { samples: MemorySample[] }) {
  const chartSamples = samples.slice(-90)
  if (chartSamples.length < 2) {
    return <div className={styles.emptyChart}>Aguardando mais amostras...</div>
  }

  const values = chartSamples.map((sample) => sample.total_mb)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const points = chartSamples
    .map((sample, index) => {
      const x = (index / (chartSamples.length - 1)) * 100
      const y = 100 - ((sample.total_mb - min) / range) * 84 - 8
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <div className={styles.chartWrap}>
      <svg className={styles.chart} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline className={styles.chartLine} points={points} />
      </svg>
      <div className={styles.chartScale}>
        <span>{formatMb(max)}</span>
        <span>{formatMb(min)}</span>
      </div>
    </div>
  )
}

function CategoryBars({ latest }: { latest: MemorySample | null }) {
  if (!latest || latest.total_mb <= 0) return null

  return (
    <div className={styles.categoryList}>
      {BUCKETS.map((bucket) => {
        const value = latest[bucket.key]
        const pct = Math.max(2, (value / latest.total_mb) * 100)
        return (
          <div key={bucket.key} className={styles.categoryRow}>
            <div className={styles.categoryMeta}>
              <span>{bucket.label}</span>
              <span>{formatMb(value)}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function MemoryAnalyticsModal() {
  const open = useUiStore((s) => s.openModal === 'memoryAnalytics')
  const onClose = useUiStore((s) => s.closeModal)
  const history = useUiStore((s) => s.memoryHistory)
  const clearMemoryHistory = useUiStore((s) => s.clearMemoryHistory)

  const latest = history[history.length - 1] ?? null
  const peak = history.reduce<MemorySample | null>(
    (current, sample) => (!current || sample.total_mb > current.total_mb ? sample : current),
    null,
  )
  const recent = latest ? history.filter((sample) => latest.ts - sample.ts <= 10 * 60_000) : []
  const windowed = recent.length >= 2 ? recent : history
  const avg = average(windowed, 'total_mb')
  const growth = getGrowth(windowed, 'total_mb')
  const diagnostics = buildDiagnostics(history)
  const top = dominantBucket(latest)
  const latestRows = history.slice(-12).reverse()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Analytics de memória"
      width={760}
      footer={
        <button type="button" className={controls.btn} onClick={clearMemoryHistory} disabled={history.length === 0}>
          <Trash2 size={14} />
          Limpar histórico
        </button>
      }
    >
      <div className={styles.layout}>
        <section className={styles.summaryGrid}>
          <div className={styles.metric}>
            <Activity size={16} />
            <span className={styles.metricLabel}>Agora</span>
            <strong>{latest ? formatMb(latest.total_mb) : '-'}</strong>
          </div>
          <div className={styles.metric}>
            <Monitor size={16} />
            <span className={styles.metricLabel}>Pico</span>
            <strong>{peak ? formatMb(peak.total_mb) : '-'}</strong>
          </div>
          <div className={styles.metric}>
            <Cpu size={16} />
            <span className={styles.metricLabel}>Média recente</span>
            <strong>{history.length ? formatMb(avg) : '-'}</strong>
          </div>
          <div className={styles.metric}>
            <Layers size={16} />
            <span className={styles.metricLabel}>Tendência</span>
            <strong className={growth >= 120 ? styles.hot : growth <= -80 ? styles.cool : undefined}>
              {growth >= 0 ? '+' : ''}
              {formatMb(growth)}
            </strong>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>Histórico</h3>
              <p>{history.length} amostras, últimas leituras no intervalo de polling da titlebar.</p>
            </div>
            {latest ? <span>{formatTime(latest.ts)}</span> : null}
          </div>
          <Sparkline samples={history} />
        </section>

        <div className={styles.columns}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h3>Gargalos</h3>
                <p>{top ? `${top.label} lidera agora com ${formatMb(top.value)}.` : 'Sem leitura atual.'}</p>
              </div>
              <AlertTriangle size={16} />
            </div>
            <div className={styles.diagnostics}>
              {diagnostics.map((item) => (
                <div key={item} className={styles.diagnosticItem}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h3>Composição atual</h3>
                <p>{latest ? `${latest.process_count} processos rastreados.` : 'Aguardando dados.'}</p>
              </div>
              <TerminalSquare size={16} />
            </div>
            <CategoryBars latest={latest} />
          </section>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>Últimas amostras</h3>
              <p>Valores separados por app, WebView e terminais.</p>
            </div>
          </div>
          <div className={styles.table}>
            <div className={`${styles.tableRow} ${styles.tableHead}`}>
              <span>Hora</span>
              <span>Total</span>
              <span>App</span>
              <span>WebView</span>
              <span>PTY</span>
              <span>Proc.</span>
            </div>
            {latestRows.length === 0 ? (
              <div className={styles.emptyRows}>Aguardando primeira leitura...</div>
            ) : (
              latestRows.map((sample) => (
                <div key={sample.ts} className={styles.tableRow}>
                  <span>{formatTime(sample.ts)}</span>
                  <strong>{formatMb(sample.total_mb)}</strong>
                  <span>{formatMb(sample.app_mb)}</span>
                  <span>{formatMb(sample.webview_mb)}</span>
                  <span>{formatMb(sample.ptys_mb)}</span>
                  <span>{sample.process_count}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Modal>
  )
}
