import "server-only";
import type { ReactNode } from "react";
export declare function Editable({ id, children, className, }: {
    id: string;
    children: ReactNode;
    className?: string;
}): Promise<import("react").JSX.Element>;
