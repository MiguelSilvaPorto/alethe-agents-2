import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Bell, X } from "lucide-react";
import { lazy, Suspense, type CSSProperties, useEffect } from "react";

import { ghosttyKillAll } from "./lib/tauri";

import { AgentIcon } from "./components/icons/AgentIcons";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FocusOverlay } from "./components/FocusOverlay";
import { MainMenu } from "./components/MainMenu";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { TaskPanel } from "./components/TaskPanel";
import { TitleBar } from "./components/TitleBar";
import { TokenHud } from "./components/TokenHud";
import { useKeybindings } from "./hooks/useKeybindings";
import { useDiscordPresence } from "./hooks/useDiscordPresence";
import { startActivityTracker } from "./lib/activityTracker";
import { intlLocale, translate } from "./lib/i18n";
import { setMaxConcurrentSpawns } from "./lib/spawnQueue";
import { getLastCrashReport, getProxyPort } from "./lib/tauri";
import { checkForUpdate } from "./lib/updater";
import { useProjectsStore } from "./stores/projectsStore";
import { type InAppToast, useUiStore } from "./stores/uiStore";
import styles from "./App.module.css";
import logoLoading from "./assets/logo-loading.png";

const AgentCanvasPOC = lazy(() =>
  import("./components/AgentCanvasPOC").then((module) => ({
    default: module.AgentCanvasPOC,
  })),
);
const HomeView = lazy(() =>
  import("./components/HomeView").then((module) => ({
    default: module.HomeView,
  })),
);
const LayoutDesignerModal = lazy(() =>
  import("./components/modals/LayoutDesignerModal").then((module) => ({
    default: module.LayoutDesignerModal,
  })),
);
const MemoryAnalyticsModal = lazy(() =>
  import("./components/modals/MemoryAnalyticsModal").then((module) => ({
    default: module.MemoryAnalyticsModal,
  })),
);
const TelemetryDashboardModal = lazy(() =>
  import("./components/modals/TelemetryDashboardModal").then((module) => ({
    default: module.TelemetryDashboardModal,
  })),
);

const WorkspaceView = lazy(() =>
  import("./components/WorkspaceView").then((module) => ({
    default: module.WorkspaceView,
  })),
);

const FindJumpModal = lazy(() =>
  import("./components/modals/FindJumpModal").then((module) => ({
    default: module.FindJumpModal,
  })),
);

const EditGroupModal = lazy(() =>
  import("./components/modals/EditGroupModal").then((module) => ({
    default: module.EditGroupModal,
  })),
);

const EditProjectModal = lazy(() =>
  import("./components/modals/EditProjectModal").then((module) => ({
    default: module.EditProjectModal,
  })),
);

const NewGroupModal = lazy(() =>
  import("./components/modals/NewGroupModal").then((module) => ({
    default: module.NewGroupModal,
  })),
);

const NewProjectModal = lazy(() =>
  import("./components/modals/NewProjectModal").then((module) => ({
    default: module.NewProjectModal,
  })),
);

const NewSubTabModal = lazy(() =>
  import("./components/modals/NewSubTabModal").then((module) => ({
    default: module.NewSubTabModal,
  })),
);

const NewTerminalModal = lazy(() =>
  import("./components/modals/NewTerminalModal").then((module) => ({
    default: module.NewTerminalModal,
  })),
);

const OnboardingModal = lazy(() =>
  import("./components/modals/OnboardingModal").then((module) => ({
    default: module.OnboardingModal,
  })),
);

const ProfilesModal = lazy(() =>
  import("./components/modals/ProfilesModal").then((module) => ({
    default: module.ProfilesModal,
  })),
);

const PreferencesModal = lazy(() =>
  import("./components/modals/PreferencesModal").then((module) => ({
    default: module.PreferencesModal,
  })),
);

const SyncModal = lazy(() =>
  import("./components/modals/SyncModal").then((module) => ({
    default: module.SyncModal,
  })),
);

const SuspendGroupModal = lazy(() =>
  import("./components/modals/SuspendGroupModal").then((module) => ({
    default: module.SuspendGroupModal,
  })),
);

const ContextModal = lazy(() =>
  import("./components/modals/ContextModal").then((module) => ({
    default: module.ContextModal,
  })),
);

const WorkflowModal = lazy(() =>
  import("./components/modals/WorkflowModal").then((module) => ({
    default: module.WorkflowModal,
  })),
);

const WorkflowDetailModal = lazy(() =>
  import("./components/modals/WorkflowDetailModal").then((module) => ({
    default: module.WorkflowDetailModal,
  })),
);

const ThemePickerModal = lazy(() =>
  import("./components/modals/ThemePickerModal").then((module) => ({
    default: module.ThemePickerModal,
  })),
);

const TopbarSettingsModal = lazy(() =>
  import("./components/modals/TopbarSettingsModal").then((module) => ({
    default: module.TopbarSettingsModal,
  })),
);

const UpdateModal = lazy(() =>
  import("./components/modals/UpdateModal").then((module) => ({
    default: module.UpdateModal,
  })),
);

const WelcomeModal = lazy(() =>
  import("./components/modals/WelcomeModal").then((module) => ({
    default: module.WelcomeModal,
  })),
);

const RejectDialog = lazy(() =>
  import("./components/TaskPanel/RejectDialog").then((module) => ({
    default: module.RejectDialog,
  })),
);

const TaskBranchModal = lazy(() =>
  import("./components/TaskPanel/TaskBranchModal").then((module) => ({
    default: module.TaskBranchModal,
  })),
);

function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <img className={styles.loadingMark} src={logoLoading} alt="Alethe" />
    </div>
  );
}

function ToastItem({ toast }: { toast: InAppToast }) {
  const dismissToast = useUiStore((s) => s.dismissToast);
  const uiTheme = useProjectsStore((s) => s.preferences.uiTheme);

  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(toast.id), 6500);
    return () => window.clearTimeout(timer);
  }, [dismissToast, toast.id]);

  const accentStyle = {
    "--toast-accent": toast.agent
      ? `var(--agent-${toast.agent})`
      : "var(--accent)",
  } as CSSProperties;

  return (
    <div className={styles.toast} role="status" style={accentStyle}>
      <div className={styles.toastIcon} aria-hidden>
        {toast.agent ? (
          <AgentIcon type={toast.agent} size={16} theme={uiTheme} />
        ) : (
          <Bell size={14} />
        )}
      </div>
      <div className={styles.toastText}>
        <strong>{toast.title}</strong>
        <span>{toast.body}</span>
      </div>
      <button
        type="button"
        className={styles.toastClose}
        onClick={() => dismissToast(toast.id)}
        aria-label="Fechar notificação"
        title="Fechar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function InAppNotifications() {
  const toasts = useUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      className={styles.toastStack}
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

export default function App() {
  const hydrate = useProjectsStore((s) => s.hydrate);
  const hydrated = useProjectsStore((s) => s.hydrated);
  const uiTheme = useProjectsStore((s) => s.preferences.uiTheme);
  const uiZoom = useProjectsStore((s) => s.preferences.uiZoom);
  const language = useProjectsStore((s) => s.preferences.language);
  const spawnConcurrency = useProjectsStore(
    (s) => s.preferences.spawnConcurrency,
  );
  const activeView = useUiStore((s) => s.activeView);
  const openModal = useUiStore((s) => s.openModal);
  const sidebarVisible = useUiStore((s) => s.sidebarVisible);

  useKeybindings();
  useDiscordPresence();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // No boot/reload da WebView, mata surfaces nativas órfãs do Ghostty: o JS é
  // recriado mas as NSViews/o app Ghostty persistem no backend. Sem isto, a cada
  // reload sobra uma surface antiga empilhada que rouba o foco do teclado — e
  // você digita sem nada aparecer. Roda UMA vez, antes de qualquer GhosttySurface.
  useEffect(() => {
    void ghosttyKillAll().catch(() => {
      /* não-macOS ou sem libghostty: no-op */
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = uiTheme;
  }, [uiTheme]);

  useEffect(() => {
    document.documentElement.lang = language === "pt-BR" ? "pt-BR" : "en";
  }, [language]);

  useEffect(() => {
    setMaxConcurrentSpawns(spawnConcurrency);
  }, [spawnConcurrency]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.zoom = String(uiZoom);
    void getCurrentWebview()
      .setZoom(uiZoom)
      .catch(() => {
        /* setZoom exige permissão Tauri em runtime; em testes/browser puro pode falhar. */
      })
      .finally(() => {
        window.dispatchEvent(
          new CustomEvent("alethe:zoom-changed", { detail: { zoom: uiZoom } }),
        );
      });
  }, [hydrated, uiZoom]);

  useEffect(() => {
    if (!hydrated) return;
    const { preferences, setPreferences } = useProjectsStore.getState();
    if (preferences.firstLaunchAt === null) {
      setPreferences({ firstLaunchAt: Date.now() });
    }
    if (preferences.accountCreated && preferences.onboardingDone) {
      useUiStore.getState().openModal_("welcome");
    }
    useUiStore
      .getState()
      .setActiveView(preferences.alwaysStartOnHome ? "home" : "workspace");
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    return startActivityTracker();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void getProxyPort()
      .then((port) => {
        useUiStore.getState().setProxyPort(port);
      })
      .catch((err) => {
        console.error("Falha ao inicializar proxy de telemetria:", err);
      });
  }, [hydrated]);

  // Checa atualização em silêncio no boot. Se houver, o chip discreto na sidebar
  // aparece (SidebarUpdate); nada de popup. Erros (dev sem assinatura, offline,
  // endpoint fora) são engolidos — updater indisponível = "sem update".
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void checkForUpdate()
      .then((info) => {
        if (!cancelled) useUiStore.getState().setUpdateInfo(info);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // Se a sessão anterior não saiu limpa (crash/OOM/kill), avisa com o estado de
  // memória de quando caiu — diagnóstico de "o que matou o app".
  useEffect(() => {
    if (!hydrated) return;
    void getLastCrashReport()
      .then((report) => {
        if (!report) return;
        const lang = useProjectsStore.getState().preferences.language;
        const when = new Date(report.last_heartbeat_ms || report.started_at_ms);
        useUiStore.getState().pushToast({
          title: translate(lang, "crash.uncleanTitle"),
          body: translate(lang, "crash.uncleanBody", {
            total: Math.round(report.total_mb),
            procs: report.process_count,
            time: when.toLocaleTimeString(intlLocale(lang)),
          }),
        });
      })
      .catch(() => {});
  }, [hydrated]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "var(--bg)",
        }}
      >
        <TitleBar />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {sidebarVisible ? <ProjectSidebar /> : null}
          <ErrorBoundary label="view">
            <div
              style={{
                display: "flex",
                flex: 1,
                minHeight: 0,
                width: "100%",
                overflow: "hidden",
              }}
            >
              {/* WorkspaceView — montado só quando workspace está ativo */}
              <Suspense fallback={<LoadingScreen />}>
                {activeView === "workspace" ? (
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    <WorkspaceView />
                  </div>
                ) : null}
              </Suspense>
              {/* TaskPanel — sempre renderizado, visibilidade controlada por CSS */}
              {activeView === "workspace" ? <TaskPanel /> : null}
              {/* HomeView e AgentCanvasPOC — lazy, montados apenas quando ativos */}
              <Suspense fallback={<LoadingScreen />}>
                {activeView === "home" ? (
                  <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                    <HomeView />
                  </div>
                ) : activeView === "agentCanvas" ? (
                  <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                    <AgentCanvasPOC />
                  </div>
                ) : null}
              </Suspense>
            </div>
          </ErrorBoundary>
        </div>
      </div>
      <FocusOverlay />
      <MainMenu />
      <ErrorBoundary label="modals">
        <Suspense fallback={null}>
          <NewProjectModal />
          <NewGroupModal />
          <EditGroupModal />
          <EditProjectModal />
          <NewTerminalModal />
          <NewSubTabModal />
          <PreferencesModal />
          <ProfilesModal />
          <SyncModal />
          <FindJumpModal />
          <OnboardingModal />
          <WelcomeModal />
          <SuspendGroupModal />
          <WorkflowModal />
          <WorkflowDetailModal />
          <ContextModal />
          <RejectDialog />
          <TaskBranchModal />
          <ThemePickerModal />
          <TopbarSettingsModal />
          <UpdateModal />
          {openModal === "layoutDesigner" ? <LayoutDesignerModal /> : null}
          {openModal === "memoryAnalytics" ? <MemoryAnalyticsModal /> : null}
          {openModal === "telemetryDashboard" ? (
            <TelemetryDashboardModal />
          ) : null}
        </Suspense>
      </ErrorBoundary>
      <InAppNotifications />
      {activeView === "agentCanvas" ? <TokenHud /> : null}
    </>
  );
}
