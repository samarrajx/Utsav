/**
 * export-bar.js - Overview export action bar (.ics, JSON backup, print/pdf)
 */

import { el, icon } from "../../dom.js";
import { exportEventJSON, downloadTextFile } from "../../storage.js";

export function renderExportBar(event, announce) {
  return el("div", { className: "export-actions-bar" }, [
    el("p", { className: "export-bar-label" }, "Export this plan:"),
    el("div", { className: "export-btn-group" }, [
      el(
        "button",
        {
          type: "button",
          className: "btn btn-secondary btn-sm",
          title: "Download calendar file to add milestones to Google/Apple Calendar",
          onClick: async () => {
            try {
              const { buildICS } = await import("../../engine/ics.js");
              const icsContent = buildICS(event);
              const safeName = (event.title || "utsav").toLowerCase().replace(/[^a-z0-9]+/g, "-");
              downloadTextFile(icsContent, `${safeName}-timeline.ics`, "text/calendar");
              if (announce) announce("Calendar file downloaded.");
            } catch (err) {
              alert("Could not generate calendar file: " + err.message);
            }
          }
        },
        [icon("calendar", "btn-icon"), "Download .ics"]
      ),
      el(
        "button",
        {
          type: "button",
          className: "btn btn-secondary btn-sm",
          title: "Download a JSON backup of your full plan",
          onClick: () => {
            try {
              exportEventJSON(event);
              if (announce) announce("JSON backup downloaded.");
            } catch (err) {
              alert("Could not export backup: " + err.message);
            }
          }
        },
        [icon("download", "btn-icon"), "Backup JSON"]
      ),
      el(
        "button",
        {
          type: "button",
          className: "btn btn-secondary btn-sm",
          title: "Print or save as PDF",
          onClick: () => window.print()
        },
        [icon("print", "btn-icon"), "Print / PDF"]
      )
    ])
  ]);
}
