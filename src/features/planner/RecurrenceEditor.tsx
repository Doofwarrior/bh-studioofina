import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  editOccurrence,
  editSeries,
  seriesDefaults,
  startSeries,
  type PlannerItem,
} from "@/lib/planner";
import { dayKey } from "../calendar/viewModel";
import type { RepeatRule } from "@/lib/recurrence";

type Props = {
  projects: { id: string; name: string }[];
  item: PlannerItem;
  projectId?: string;
  refresh: () => void;
};
type Scope = "this" | "future" | "entire";
const field = "border border-qah-border bg-qah-bg px-2 py-1";

export function RecurrenceEditor(props: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("this");
  const occurrence = props.item.occurrence;
  return (
    <details
      className="basis-full border-t border-qah-border pt-2 text-sm"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer">
        {occurrence ? "Recurring task · " + occurrence.slot : "Repeat task"}
      </summary>
      {open && (
        <>
          {occurrence && (
            <>
              <label>
                Edit scope{" "}
                <select
                  className={field}
                  value={scope}
                  onChange={(e) => setScope(e.target.value as Scope)}
                >
                  <option value="this">This Occurrence</option>
                  <option value="future">This and Future</option>
                  <option value="entire">Entire Series</option>
                </select>
              </label>
              {!!props.item.referenceLinks?.length && (
                <p>
                  Occurrence references ·{" "}
                  {props.item.referenceLinks.join(" · ")}
                </p>
              )}
            </>
          )}
          <RepeatForm
            key={scope}
            {...props}
            scope={scope}
            close={() => setOpen(false)}
          />
        </>
      )}
    </details>
  );
}

function RepeatForm({
  projects,
  item,
  projectId,
  refresh,
  scope,
  close,
}: Props & { scope: Scope; close: () => void }) {
  const single = !!item.occurrence && scope === "this";
  const segment =
    item.occurrence && !single
      ? seriesDefaults(item, projectId, scope === "entire")
      : undefined;
  const [date, setDate] = useState(
    item.dueDate?.slice(0, 10) ?? dayKey(new Date()),
  );
  const [time, setTime] = useState(
    segment?.time ?? item.dueDate?.slice(11, 16) ?? "",
  );
  const [deadlineOffset, setDeadlineOffset] = useState(
    segment?.deadlineOffset ?? 0,
  );
  const [title, setTitle] = useState(segment?.title ?? item.title);
  const [frequency, setFrequency] = useState<RepeatRule["frequency"]>(
    segment?.rule.frequency ?? "daily",
  );
  const [interval, setInterval] = useState(segment?.rule.interval ?? 1);
  const [days, setDays] = useState<number[]>(segment?.rule.weekdays ?? []);
  const [until, setUntil] = useState(segment?.rule.until ?? "");
  const [links, setLinks] = useState(
    (segment?.links ?? item.referenceLinks ?? []).join("\n"),
  );
  const [error, setError] = useState("");
  return (
    <form
      className="my-2 flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const rule = {
          frequency,
          interval,
          until: until || undefined,
          weekdays: frequency === "weekly" && days.length ? days : undefined,
        };
        const references = [
          ...new Set(
            links
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ];
        const due = date + (time ? "T" + time : "");
        try {
          if (!item.occurrence)
            startSeries(item.id, projectId, due, rule, references);
          else if (scope === "this")
            editOccurrence(item.id, projectId, title, due);
          else
            editSeries(
              item.id,
              projectId,
              scope,
              { rule, time, title, links: references, deadlineOffset },
              projects,
            );
          refresh();
          close();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Could not save recurrence.",
          );
        }
      }}
    >
      {item.occurrence && (
        <label>
          Task title{" "}
          <input
            className={field}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}
      {(!item.occurrence || single) && (
        <label>
          Deadline date{" "}
          <input
            className={field}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      )}
      {segment && (
        <label>
          Deadline offset (days from occurrence){" "}
          <input
            className={field + " w-20"}
            type="number"
            step="1"
            required
            value={deadlineOffset}
            onChange={(e) => setDeadlineOffset(Number(e.target.value))}
          />
        </label>
      )}
      <label>
        Deadline time{" "}
        <input
          className={field}
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </label>
      {!single && (
        <>
          <label>
            Repeat every{" "}
            <input
              className={field + " w-16"}
              type="number"
              min="1"
              required
              value={interval || ""}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
          </label>
          <label>
            Frequency{" "}
            <select
              className={field}
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as RepeatRule["frequency"])
              }
            >
              <option value="daily">Days</option>
              <option value="weekly">Weeks</option>
              <option value="monthly">Months</option>
            </select>
          </label>
          {frequency === "weekly" && (
            <fieldset>
              <legend>Weekdays</legend>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day, i) => (
                  <label className="mr-2" key={day}>
                    <input
                      type="checkbox"
                      checked={days.includes(i)}
                      onChange={(e) =>
                        setDays(
                          e.target.checked
                            ? [...days, i].sort()
                            : days.filter((d) => d !== i),
                        )
                      }
                    />{" "}
                    {day}
                  </label>
                ),
              )}
            </fieldset>
          )}
          <label>
            Repeat through{" "}
            <input
              className={field}
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <label>
            Series references (one per line){" "}
            <textarea
              className={field}
              value={links}
              onChange={(e) => setLinks(e.target.value)}
            />
          </label>
        </>
      )}
      {segment && (
        <p className="basis-full">
          Apply from {scope === "entire" ? segment.from : item.occurrence?.slot}
          . Completed occurrences, individual edits and saved references are
          preserved.
        </p>
      )}
      <Button size="sm" disabled={single && item.status === "done"}>
        {item.occurrence ? "Save changes" : "Start recurrence"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
