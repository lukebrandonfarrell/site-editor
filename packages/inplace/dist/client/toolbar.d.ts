import { type PublishPhase } from "./publish-state.js";
export declare function EditorChrome({ showBar, minimized, authenticated, pending, phase, notice, loginOpen, loginStatus, loginError, busy, onPublish, onMinimize, onShow, onLogin, onCloseLogin, onLogout, }: {
    showBar: boolean;
    minimized: boolean;
    authenticated: boolean;
    pending: number;
    phase: PublishPhase;
    notice: string;
    loginOpen: boolean;
    loginStatus: string;
    loginError: string;
    busy: boolean;
    onPublish: () => void;
    onMinimize: () => void;
    onShow: () => void;
    onLogin: (email: string) => Promise<void>;
    onCloseLogin: () => void;
    onLogout: () => void;
}): import("react").JSX.Element;
