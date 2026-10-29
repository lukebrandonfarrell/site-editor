import { jsx as _jsx } from "react/jsx-runtime";
import "server-only";
import { EditableView } from "../client/editable-view.js";
import { resolveSpot } from "./content.js";
export async function Editable({ id, children, className, }) {
    if (typeof children !== "string") {
        throw new Error(`Editable "${id}" needs a plain text child. That string is only used to seed the spot the first time it is created.`);
    }
    const publishedValue = await resolveSpot(id, children);
    return _jsx(EditableView, { id: id, publishedValue: publishedValue, className: className });
}
