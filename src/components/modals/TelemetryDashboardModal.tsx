import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useT } from "../../lib/i18n";
import {
  getTelemetrySummary,
  clearTelemetryStats,
  type TelemetrySummary,
} from "../../lib/tauri";
import { useUiStore } from "../../stores/uiStore";
import { Modal } from "./Modal";
import controls from "./controls.module.css";
import styles from "./TelemetryDashboardModal.module.css";

export function TelemetryDashboardModal() {
  const t = useT();
  const open = useUiStore((s) => s.openModal === "telemetryDashboard");
  const onClose = useUiStore((s) => s.closeModal);

  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getTelemetrySummary();
      setSummary(data);
    } catch (e) {
      console.error("Failed to load telemetry summary:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchData();
    }
  }, [open]);

  const handleClear = async () => {
    if (!window.confirm(t("mod.telemetryClearData") + "?")) return;
    try {
      await clearTelemetryStats();
      void fetchData();
    } catch (e) {
      console.error("Failed to clear telemetry:", e);
    }
  };

  const formatTokens = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
  };

  const maxDailyCost =
    summary?.daily_history.reduce(
      (max, d) => Math.max(max, d.cost_usd),
      0.01,
    ) || 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("mod.telemetryDashboardTitle")}
      width={780}
      footer={
        <button
          type="button"
          className={controls.btn}
          onClick={handleClear}
          disabled={!summary || summary.total_tokens === 0}
        >
          <Trash2 size={14} />
          {t("mod.telemetryClearData")}
        </button>
      }
    >
      {loading && !summary ? (
        <div className={styles.noData}>{t("mod.waitingData")}</div>
      ) : summary ? (
        <div className={styles.layout}>
          <div className={styles.infoBox}>{t("mod.telemetryProxyInfo")}</div>
          <div className={styles.summaryGrid}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>
                {t("mod.telemetryTotalCost")}
              </span>
              <strong>${summary.total_cost_usd.toFixed(4)}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>
                {t("mod.telemetryTotalTokens")}
              </span>
              <strong>{formatTokens(summary.total_tokens)}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>
                {t("mod.telemetryPromptTokens")}
              </span>
              <strong>{formatTokens(summary.prompt_tokens)}</strong>
            </div>
          </div>

          <div className={styles.secondaryMetrics}>
            <div className={styles.subMetric}>
              <span className={styles.subMetricLabel}>
                {t("mod.telemetryCompletionTokens")}
              </span>
              <span className={styles.subMetricVal}>
                {formatTokens(summary.completion_tokens)}
              </span>
            </div>
            <div className={styles.subMetric}>
              <span className={styles.subMetricLabel}>
                {t("mod.telemetryCacheReadTokens")}
              </span>
              <span className={styles.subMetricVal}>
                {formatTokens(summary.cache_read_tokens)}
              </span>
            </div>
            <div className={styles.subMetric}>
              <span className={styles.subMetricLabel}>
                {t("mod.telemetryCacheWriteTokens")}
              </span>
              <span className={styles.subMetricVal}>
                {formatTokens(summary.cache_write_tokens)}
              </span>
            </div>
            <div className={styles.subMetric}>
              <span className={styles.subMetricLabel}>Cache Ratio</span>
              <span className={styles.subMetricVal}>
                {summary.total_tokens > 0
                  ? `${(
                      (summary.cache_read_tokens / summary.total_tokens) *
                      100
                    ).toFixed(1)}%`
                  : "0%"}
              </span>
            </div>
          </div>

          <div className={styles.panels}>
            <div className={styles.panel}>
              <h3>{t("mod.telemetryBySource")}</h3>
              <div className={styles.list}>
                {summary.by_source.length === 0 ? (
                  <div className={styles.noData}>{t("mod.noDataYet")}</div>
                ) : (
                  summary.by_source.map((s) => (
                    <div key={s.source} className={styles.row}>
                      <span className={styles.rowLabel}>
                        {s.source === "claude_code" || s.source === "claude"
                          ? "Claude Code"
                          : s.source === "codex_cli" || s.source === "codex"
                            ? "OpenAI Codex"
                            : "OpenCode"}
                      </span>
                      <div className={styles.rowVal}>
                        <span>{formatTokens(s.tokens)} tokens</span>
                        <span className={styles.rowCost}>
                          ${s.cost_usd.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.panel}>
              <h3>{t("mod.telemetryByModel")}</h3>
              <div className={styles.list}>
                {summary.by_model.length === 0 ? (
                  <div className={styles.noData}>{t("mod.noDataYet")}</div>
                ) : (
                  summary.by_model.map((m) => (
                    <div key={m.model} className={styles.row}>
                      <span className={styles.rowLabel}>{m.model}</span>
                      <div className={styles.rowVal}>
                        <span>{formatTokens(m.tokens)} tokens</span>
                        <span className={styles.rowCost}>
                          ${m.cost_usd.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`${styles.panel} ${styles.dailyPanel}`}>
              <h3>{t("mod.telemetryDailyHistory")}</h3>
              {summary.daily_history.length === 0 ? (
                <div className={styles.noData}>{t("mod.noDataYet")}</div>
              ) : (
                <div className={styles.dailyList}>
                  {summary.daily_history.map((d) => {
                    const heightPct = Math.max(
                      5,
                      (d.cost_usd / maxDailyCost) * 100,
                    );
                    return (
                      <div
                        key={d.date_str}
                        className={styles.dailyBarContainer}
                      >
                        <div
                          className={styles.dailyBar}
                          style={{ height: `${heightPct}%` }}
                          data-tooltip={`${d.date_str}: $${d.cost_usd.toFixed(4)} (${formatTokens(d.tokens)} tokens)`}
                        />
                        <span className={styles.dailyLabel}>
                          {d.date_str.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.noData}>{t("mod.noDataYet")}</div>
      )}
    </Modal>
  );
}
